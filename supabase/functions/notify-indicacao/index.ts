// Edge Function: notify-indicacao
// Gatilho: Supabase Database Webhook em INSERT de `indicacoes`.
// Posta uma mensagem no Slack com os dados do lead indicado e de quem indicou.
//
// Secrets esperados:
//   SLACK_BOT_TOKEN          — xoxb-... (mesmo da slack-proxy / handoff)
//   SLACK_LEADS_CHANNEL_ID   — ID do canal de leads (ex.: C0XXXXXX). Fallback: SLACK_CHANNEL_ID
//   WEBHOOK_INDICACAO_SECRET — string do header Authorization do Database Webhook
//   APP_URL                  — base pública do CRM
//   SUPABASE_URL             — injetado automaticamente
//   SUPABASE_SERVICE_ROLE_KEY — injetado automaticamente

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { HydratedIndicacao, IndicacaoRow, WebhookPayload } from './types.ts'
import { buildIndicacaoBlocks, buildIndicacaoFallbackText } from './slack.ts'

const SLACK_BOT_TOKEN          = Deno.env.get('SLACK_BOT_TOKEN')
const SLACK_LEADS_CHANNEL_ID   = Deno.env.get('SLACK_LEADS_CHANNEL_ID') ?? Deno.env.get('SLACK_CHANNEL_ID')
const WEBHOOK_SECRET           = Deno.env.get('WEBHOOK_INDICACAO_SECRET')
const APP_URL                  = Deno.env.get('APP_URL') ?? 'https://localhost:5173'
const SUPABASE_URL             = Deno.env.get('SUPABASE_URL')!
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

function extrairSegmento(notas: string | null): string | null {
  if (!notas) return null
  const match = notas.match(/Segmento:\s*(.+?)(\n|$)/i)
  return match ? match[1].trim() : null
}

async function hydrateIndicacao(ind: IndicacaoRow): Promise<HydratedIndicacao> {
  let indicante_tipo: HydratedIndicacao['indicante_tipo'] = 'desconhecida'
  let indicante_nome: string | null = null
  let indicante_email: string | null = null
  let indicante_empresa: string | null = null
  let indicante_telefone: string | null = null
  let portal_perfil_nome: string | null = null
  let portal_tokens_creditados: number | null = null

  if (ind.indicante_cliente_id) {
    indicante_tipo = 'cliente'
    const { data: cliente } = await supabase
      .from('clientes')
      .select('nome, email, empresa, telefone, contato_principal')
      .eq('id', ind.indicante_cliente_id)
      .maybeSingle()
    if (cliente) {
      indicante_nome     = (cliente as { contato_principal?: string }).contato_principal ?? (cliente as { nome?: string }).nome ?? null
      indicante_email    = (cliente as { email?: string }).email ?? null
      indicante_empresa  = (cliente as { empresa?: string }).empresa ?? (cliente as { nome?: string }).nome ?? null
      indicante_telefone = (cliente as { telefone?: string }).telefone ?? null
    }

    // Se houver perfil portal vinculado, busca o crédito feito para essa indicação
    const { data: perfil } = await supabase
      .from('perfis')
      .select('id, nome')
      .eq('cliente_id', ind.indicante_cliente_id)
      .eq('tipo', 'cliente')
      .maybeSingle()

    if (perfil) {
      portal_perfil_nome = (perfil as { nome?: string }).nome ?? null
      const { data: tx } = await supabase
        .from('token_transacoes')
        .select('valor')
        .eq('referencia_id', ind.id)
        .eq('motivo', 'indicacao')
        .eq('tipo', 'credito')
        .maybeSingle()
      if (tx) portal_tokens_creditados = (tx as { valor?: number }).valor ?? null
    }
  } else if (ind.indicante_parceiro_id) {
    indicante_tipo = 'parceiro'
    const { data: parceiro } = await supabase
      .from('parceiros')
      .select('nome, email, telefone, organizacao')
      .eq('id', ind.indicante_parceiro_id)
      .maybeSingle()
    if (parceiro) {
      indicante_nome     = (parceiro as { nome?: string }).nome ?? null
      indicante_email    = (parceiro as { email?: string }).email ?? null
      indicante_empresa  = (parceiro as { organizacao?: string }).organizacao ?? null
      indicante_telefone = (parceiro as { telefone?: string }).telefone ?? null
    }
  }

  return {
    ...ind,
    indicante_tipo,
    indicante_nome,
    indicante_email,
    indicante_empresa,
    indicante_telefone,
    portal_perfil_nome,
    portal_tokens_creditados,
    segmento: extrairSegmento(ind.notas),
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
        channel: SLACK_LEADS_CHANNEL_ID,
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
    if (auth !== `Bearer ${WEBHOOK_SECRET}`) {
      return json({ ok: false, error: 'unauthorized' }, 401)
    }
  }

  if (!SLACK_BOT_TOKEN || !SLACK_LEADS_CHANNEL_ID) {
    return json({ ok: false, error: 'Slack secrets não configurados' }, 500)
  }

  let payload: WebhookPayload
  try {
    payload = await req.json() as WebhookPayload
  } catch {
    return json({ ok: false, error: 'invalid JSON' }, 400)
  }

  if (payload.table !== 'indicacoes' || payload.type !== 'INSERT' || !payload.record) {
    return json({ ok: true, skipped: 'not an indicacoes INSERT' })
  }

  const ind = payload.record
  const origem: 'cliente' | 'parceiro' | 'desconhecida' =
    ind.indicante_cliente_id  ? 'cliente'  :
    ind.indicante_parceiro_id ? 'parceiro' :
    'desconhecida'

  // Idempotência: UNIQUE(indicacao_id) bloqueia duplicação
  const { error: insertErr } = await supabase
    .from('notificacoes_indicacao')
    .insert({
      indicacao_id: ind.id,
      origem,
      slack_channel: SLACK_LEADS_CHANNEL_ID,
      status: 'pendente',
      tentativas: 0,
    })

  if (insertErr) {
    if (/duplicate key|unique/i.test(insertErr.message)) {
      return json({ ok: true, skipped: 'já notificado (idempotência)' })
    }
    return json({ ok: false, error: `insert falhou: ${insertErr.message}` }, 500)
  }

  try {
    const hydrated = await hydrateIndicacao(ind)
    const blocks   = buildIndicacaoBlocks(hydrated, APP_URL)
    const fallback = buildIndicacaoFallbackText(hydrated)
    const payloadHash = await sha256Hex(JSON.stringify(blocks))

    const result = await postToSlack(blocks, fallback)

    if (!result.ok) {
      await supabase
        .from('notificacoes_indicacao')
        .update({
          status: 'erro',
          erro_mensagem: result.error ?? 'unknown',
          tentativas: 3,
          payload_hash: payloadHash,
        })
        .eq('indicacao_id', ind.id)
      return json({ ok: false, error: result.error }, 502)
    }

    await supabase
      .from('notificacoes_indicacao')
      .update({
        status: 'enviado',
        slack_ts: result.ts,
        enviado_em: new Date().toISOString(),
        tentativas: 1,
        payload_hash: payloadHash,
      })
      .eq('indicacao_id', ind.id)

    return json({ ok: true, ts: result.ts })
  } catch (err) {
    const message = (err as Error).message
    await supabase
      .from('notificacoes_indicacao')
      .update({ status: 'erro', erro_mensagem: message })
      .eq('indicacao_id', ind.id)
    return json({ ok: false, error: message }, 500)
  }
})
