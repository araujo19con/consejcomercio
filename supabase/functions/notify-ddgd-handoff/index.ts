// Edge Function: notify-ddgd-handoff
// Gatilho: Supabase Database Webhook em UPDATE de `leads`.
// Dispara mensagem no Slack da DDGD quando o status transita para um estágio "ganho".
//
// Secrets esperados:
//   SLACK_BOT_TOKEN      — xoxb-... (mesmo token da função slack-proxy)
//   SLACK_CHANNEL_ID     — ID do canal DDGD (ex.: C0XXXXXX)
//   WEBHOOK_SECRET       — string compartilhada com o Database Webhook (header Authorization: Bearer ...)
//   APP_URL              — base pública do CRM (ex.: https://crm.consej.com.br)
//   SUPABASE_URL         — injetado automaticamente
//   SUPABASE_SERVICE_ROLE_KEY — injetado automaticamente

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { timingSafeEqual } from 'https://deno.land/std@0.224.0/crypto/timing_safe_equal.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function constantTimeAuthCheck(received: string, expectedSecret: string): boolean {
  const enc = new TextEncoder()
  const expected = enc.encode(`Bearer ${expectedSecret}`)
  const got = enc.encode(received)
  if (got.length !== expected.length) {
    timingSafeEqual(expected, expected)
    return false
  }
  return timingSafeEqual(got, expected)
}
import type { HydratedLead, LeadRow, WebhookPayload } from './types.ts'
import { buildFallbackText, buildHandoffBlocks } from './slack.ts'

const TERMINAL_WON_STAGES = ['ganho_assessoria', 'ganho_consultoria']

const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN')
const SLACK_CHANNEL_ID = Deno.env.get('SLACK_CHANNEL_ID')
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET')
const APP_URL = Deno.env.get('APP_URL') ?? 'https://localhost:5173'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function isTransitionToWon(oldRow: LeadRow | null, newRow: LeadRow | null): boolean {
  if (!newRow) return false
  if (!TERMINAL_WON_STAGES.includes(newRow.status)) return false
  const wasAlreadyWon = oldRow ? TERMINAL_WON_STAGES.includes(oldRow.status) : false
  return !wasAlreadyWon
}

async function hydrateLead(lead: LeadRow): Promise<HydratedLead> {
  const [closerRes, prospectorRes, diagRes, clienteRes, dossieRes] = await Promise.all([
    lead.fechado_por_id
      ? supabase.from('perfis').select('nome,email').eq('id', lead.fechado_por_id).maybeSingle()
      : Promise.resolve({ data: null }),
    lead.responsavel_id
      ? supabase.from('perfis').select('nome').eq('id', lead.responsavel_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('diagnosticos').select('cluster_recomendado').eq('lead_id', lead.id).maybeSingle(),
    supabase.from('clientes').select('id').eq('lead_id', lead.id).maybeSingle(),
    supabase
      .from('passagem_bastao')
      .select('dores_expectativas,perfil_comunicacao,info_financeira,prazos_marcos')
      .eq('lead_id', lead.id)
      .maybeSingle(),
  ])

  let contrato: {
    tipo: string | null
    modelo_precificacao: string | null
    valor_total: number | null
    valor_mensal: number | null
  } | null = null

  if (clienteRes.data?.id) {
    const { data } = await supabase
      .from('contratos')
      .select('tipo,modelo_precificacao,valor_total,valor_mensal')
      .eq('cliente_id', clienteRes.data.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    contrato = data
  }

  const dossie = dossieRes.data as {
    dores_expectativas?: string | null
    perfil_comunicacao?: string | null
    info_financeira?: string | null
    prazos_marcos?: string | null
  } | null

  return {
    ...lead,
    closer_nome: (closerRes.data as { nome?: string } | null)?.nome ?? null,
    closer_email: (closerRes.data as { email?: string } | null)?.email ?? null,
    prospector_nome: (prospectorRes.data as { nome?: string } | null)?.nome ?? null,
    cliente_id: clienteRes.data?.id ?? null,
    contrato_tipo: contrato?.tipo ?? null,
    contrato_modelo_precificacao: contrato?.modelo_precificacao ?? null,
    contrato_valor_total: contrato?.valor_total ?? null,
    contrato_valor_mensal: contrato?.valor_mensal ?? null,
    diagnostico_cluster: (diagRes.data as { cluster_recomendado?: string } | null)?.cluster_recomendado ?? null,
    dossie_dores_expectativas: dossie?.dores_expectativas ?? null,
    dossie_perfil_comunicacao: dossie?.perfil_comunicacao ?? null,
    dossie_info_financeira: dossie?.info_financeira ?? null,
    dossie_prazos_marcos: dossie?.prazos_marcos ?? null,
  }
}

async function postToSlack(blocks: unknown[], fallbackText: string): Promise<{ ok: boolean; ts?: string; error?: string }> {
  const attempts = 3
  for (let i = 0; i < attempts; i++) {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        channel: SLACK_CHANNEL_ID,
        text: fallbackText,
        blocks,
        unfurl_links: false,
      }),
    })

    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** i))
      continue
    }

    const body = await res.json() as { ok: boolean; ts?: string; error?: string }
    if (!body.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` }
    return { ok: true, ts: body.ts }
  }
  return { ok: false, error: 'Slack API unavailable after retries' }
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405)

  if (WEBHOOK_SECRET) {
    const auth = req.headers.get('Authorization') ?? ''
    if (!constantTimeAuthCheck(auth, WEBHOOK_SECRET)) {
      return json({ ok: false, error: 'unauthorized' }, 401)
    }
  }

  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
    return json({ ok: false, error: 'Slack secrets não configurados' }, 500)
  }

  let payload: WebhookPayload
  try {
    payload = await req.json() as WebhookPayload
  } catch {
    return json({ ok: false, error: 'invalid JSON' }, 400)
  }

  if (payload.table !== 'leads' || payload.type !== 'UPDATE') {
    return json({ ok: true, skipped: 'not a leads UPDATE' })
  }

  if (!isTransitionToWon(payload.old_record, payload.record)) {
    return json({ ok: true, skipped: 'not a transition to won' })
  }

  const lead = payload.record!

  // Idempotência: reserva a linha com UNIQUE(lead_id). Se já existe, aborta.
  const { error: insertErr } = await supabase
    .from('notificacoes_ddgd')
    .insert({
      lead_id: lead.id,
      status_gatilho: lead.status,
      slack_channel: SLACK_CHANNEL_ID,
      status: 'pendente',
      tentativas: 0,
    })

  if (insertErr) {
    const duplicate = /duplicate key|unique/i.test(insertErr.message)
    if (duplicate) return json({ ok: true, skipped: 'já notificado (idempotência)' })
    return json({ ok: false, error: `insert falhou: ${insertErr.message}` }, 500)
  }

  try {
    const hydrated = await hydrateLead(lead)
    const blocks = buildHandoffBlocks(hydrated, APP_URL)
    const fallback = buildFallbackText(hydrated)
    const payloadHash = await sha256Hex(JSON.stringify(blocks))

    const result = await postToSlack(blocks, fallback)

    if (!result.ok) {
      await supabase
        .from('notificacoes_ddgd')
        .update({
          status: 'erro',
          erro_mensagem: result.error ?? 'unknown',
          tentativas: 3,
          payload_hash: payloadHash,
        })
        .eq('lead_id', lead.id)
      return json({ ok: false, error: result.error }, 502)
    }

    await supabase
      .from('notificacoes_ddgd')
      .update({
        status: 'enviado',
        slack_ts: result.ts,
        enviado_em: new Date().toISOString(),
        tentativas: 1,
        payload_hash: payloadHash,
      })
      .eq('lead_id', lead.id)

    return json({ ok: true, ts: result.ts })
  } catch (err) {
    const message = (err as Error).message
    await supabase
      .from('notificacoes_ddgd')
      .update({ status: 'erro', erro_mensagem: message })
      .eq('lead_id', lead.id)
    return json({ ok: false, error: message }, 500)
  }
})
