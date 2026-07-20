// Edge Function: sync-calendar
// Gatilho: trigger pg_net (migration 042) em INSERT/UPDATE/DELETE de `tarefas`
// e `reunioes`. Reflete o compromisso no Google Calendar do consultor
// responsável (tarefas.atribuido_a_id / reunioes.responsavel_id), no calendário
// dedicado "CONSEJ Follow-ups". Ciclo completo: cria / atualiza / cancela.
//
// Requer secrets: WEBHOOK_CALENDAR_SECRET, GOOGLE_OAUTH_CLIENT_ID,
//                 GOOGLE_OAUTH_CLIENT_SECRET, APP_URL, SUPABASE_URL,
//                 SUPABASE_SERVICE_ROLE_KEY.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { constantTimeAuthCheck } from '../_shared/auth.ts'
import {
  refreshAccessToken,
  insertEvent,
  patchEvent,
  deleteEvent,
  TIMEZONE,
  type CalendarEvent,
} from '../_shared/google-calendar.ts'

const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_CALENDAR_SECRET')
const CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!
const CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!
const APP_URL = (Deno.env.get('APP_URL') ?? 'https://consejcomercio.vercel.app').replace(/\/$/, '')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

// deno-lint-ignore no-explicit-any
type Row = Record<string, any>
interface Payload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: Row | null
  old_record: Row | null
}

const REMINDERS = {
  useDefault: false,
  overrides: [
    { method: 'popup', minutes: 1440 }, // 1 dia antes
    { method: 'popup', minutes: 30 },   // 30 min antes
  ],
}

const TAREFA_TERMINAL = new Set(['concluida', 'cancelada'])
const REUNIAO_CANCEL = new Set(['cancelada'])

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function addMinutesISO(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString()
}

function crmLink(entidadeTipo: string | null, entidadeId: string | null, fallback: string): string {
  if (entidadeTipo && entidadeId) {
    const seg = entidadeTipo === 'lead' ? 'leads'
      : entidadeTipo === 'cliente' ? 'clientes'
      : entidadeTipo
    return `${APP_URL}/${seg}/${entidadeId}`
  }
  return `${APP_URL}${fallback}`
}

function buildTarefaEvent(r: Row): CalendarEvent {
  const start = r.data_vencimento as string
  const link = crmLink(r.entidade_tipo, r.entidade_id, `/tarefas?highlight=${r.id}`)
  const desc = [
    r.descricao || null,
    `🔗 Abrir no CRM: ${link}`,
    '',
    '(evento gerido automaticamente pelo CRM CONSEJ — tipo: ' + (r.tipo || 'tarefa') + ')',
  ].filter(Boolean).join('\n')
  return {
    summary: r.titulo || 'Follow-up',
    description: desc,
    start: { dateTime: new Date(start).toISOString(), timeZone: TIMEZONE },
    end: { dateTime: addMinutesISO(start, 30), timeZone: TIMEZONE },
    reminders: REMINDERS,
  }
}

function buildReuniaoEvent(r: Row): CalendarEvent {
  const start = r.data_hora as string
  const dur = Number(r.duracao_minutos) || 60
  const fallback = r.lead_id ? `/leads/${r.lead_id}` : r.cliente_id ? `/clientes/${r.cliente_id}` : '/reunioes'
  const link = `${APP_URL}${fallback}`
  const desc = [
    r.notas || null,
    r.link_video ? `📹 Vídeo: ${r.link_video}` : null,
    `🔗 Abrir no CRM: ${link}`,
    '',
    '(evento gerido automaticamente pelo CRM CONSEJ)',
  ].filter(Boolean).join('\n')
  return {
    summary: r.assunto || r.titulo || 'Reunião CONSEJ',
    description: desc,
    location: r.local || undefined,
    start: { dateTime: new Date(start).toISOString(), timeZone: TIMEZONE },
    end: { dateTime: addMinutesISO(start, dur), timeZone: TIMEZONE },
    reminders: REMINDERS,
  }
}

serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405)
  // FAIL-CLOSED: esta function roda com --no-verify-jwt, então o Bearer secret é a
  // ÚNICA barreira de auth. Sem o secret configurado, rejeita tudo — nunca fail-open
  // (senão qualquer POST anônimo manipularia eventos/DB via service_role).
  if (!WEBHOOK_SECRET) return json({ ok: false, error: 'server misconfigured (WEBHOOK_CALENDAR_SECRET)' }, 500)
  if (!constantTimeAuthCheck(req.headers.get('Authorization') ?? '', WEBHOOK_SECRET)) {
    return json({ ok: false, error: 'unauthorized' }, 401)
  }

  let payload: Payload
  try { payload = await req.json() } catch { return json({ ok: false, error: 'invalid JSON' }, 400) }

  const { type, table } = payload
  if (table !== 'tarefas' && table !== 'reunioes') return json({ ok: true, skipped: 'tabela ignorada' })

  const row = payload.record ?? payload.old_record
  if (!row) return json({ ok: true, skipped: 'sem row' })

  // Consultor responsável + datetime âncora, por tabela
  const isTarefa = table === 'tarefas'
  const consultorId = isTarefa ? row.atribuido_a_id : row.responsavel_id
  if (!consultorId) return json({ ok: true, skipped: 'sem responsável' })

  // Conexão do consultor (se não conectou o Google, não há o que sincronizar)
  const { data: conn } = await supabase
    .from('google_calendar_connections')
    .select('refresh_token, calendar_id')
    .eq('perfil_id', consultorId)
    .maybeSingle()
  if (!conn || !conn.calendar_id) return json({ ok: true, skipped: 'consultor sem Google conectado' })

  // access_token fresco
  let accessToken: string
  try {
    accessToken = await refreshAccessToken(CLIENT_ID, CLIENT_SECRET, conn.refresh_token)
  } catch (e) {
    // refresh_token revogado/expirado → marca desconectado para a UI refletir
    await supabase.from('perfis').update({ google_calendar_conectado: false }).eq('id', consultorId)
    return json({ ok: false, error: 'refresh falhou — consultor marcado desconectado', detail: String(e) }, 200)
  }

  const calId = conn.calendar_id
  const existingEventId: string | null = (payload.record ?? payload.old_record)?.google_event_id ?? null

  // ─── DELETE do registro → remove o evento ──────────────────────────────────
  if (type === 'DELETE') {
    if (existingEventId) await deleteEvent(accessToken, calId, existingEventId)
    return json({ ok: true, action: 'deleted', eventId: existingEventId })
  }

  const rec = payload.record!
  const status = String(rec.status ?? '')
  const datetime = isTarefa ? rec.data_vencimento : rec.data_hora

  // ─── Cancelar/concluir OU perder a data → remove o evento ──────────────────
  const terminal = isTarefa ? TAREFA_TERMINAL.has(status) : REUNIAO_CANCEL.has(status)
  const semData = !datetime
  if (terminal || semData) {
    if (rec.google_event_id) {
      await deleteEvent(accessToken, calId, rec.google_event_id)
      await supabase.from(table).update({ google_event_id: null }).eq('id', rec.id)
      return json({ ok: true, action: 'canceled', reason: terminal ? 'terminal' : 'sem_data' })
    }
    return json({ ok: true, skipped: terminal ? 'terminal sem evento' : 'sem data' })
  }

  // ─── Criar / atualizar o evento ────────────────────────────────────────────
  const event = isTarefa ? buildTarefaEvent(rec) : buildReuniaoEvent(rec)

  if (rec.google_event_id) {
    const patched = await patchEvent(accessToken, calId, rec.google_event_id, event)
    if (patched) return json({ ok: true, action: 'updated', eventId: rec.google_event_id })
    // evento sumiu manualmente → recria abaixo
  }

  const newId = await insertEvent(accessToken, calId, event)
  await supabase.from(table).update({ google_event_id: newId }).eq('id', rec.id)
  return json({ ok: true, action: 'created', eventId: newId })
})
