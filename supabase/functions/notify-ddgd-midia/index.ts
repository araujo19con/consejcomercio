// Edge Function: notify-ddgd-midia
// Recebe { midia_id } do frontend (supabase.functions.invoke).
// Baixa o arquivo do bucket `handoff-media` e faz upload no Slack como reply da thread
// da mensagem principal registrada em `notificacoes_ddgd.slack_ts`.
//
// Secrets:
//   SLACK_BOT_TOKEN
//   SLACK_CHANNEL_ID
//   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (injetados)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN')
const SLACK_CHANNEL_ID = Deno.env.get('SLACK_CHANNEL_ID')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_URL = Deno.env.get('APP_URL') ?? ''

const BUCKET = 'handoff-media'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const ALLOWED_ORIGINS = new Set([
  APP_URL.replace(/\/$/, ''),
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean))

function corsHeadersFor(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : APP_URL.replace(/\/$/, '')
  return {
    'Access-Control-Allow-Origin': allowed || 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

function jsonWithCors(origin: string | null) {
  return (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeadersFor(origin), 'Content-Type': 'application/json' },
    })
}

async function slackApi(endpoint: string, init: RequestInit): Promise<Record<string, unknown>> {
  const res = await fetch(`https://slack.com/api/${endpoint}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
    },
  })
  return await res.json() as Record<string, unknown>
}

serve(async (req) => {
  const origin = req.headers.get('Origin')
  const json = jsonWithCors(origin)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeadersFor(origin) })
  if (req.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405)

  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
    return json({ ok: false, error: 'Slack secrets não configurados' }, 500)
  }

  // ─── Auth: apenas internos podem acionar uploads de mídia para o Slack ───
  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!jwt) return json({ ok: false, error: 'unauthorized' }, 401)

  const { data: userData, error: userError } = await supabase.auth.getUser(jwt)
  if (userError || !userData?.user) return json({ ok: false, error: 'invalid token' }, 401)

  const { data: perfilCaller } = await supabase
    .from('perfis')
    .select('tipo')
    .eq('id', userData.user.id)
    .maybeSingle()
  if (perfilCaller?.tipo !== 'interno') {
    return json({ ok: false, error: 'forbidden — apenas internos' }, 403)
  }

  let body: { midia_id?: string }
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, error: 'invalid JSON' }, 400)
  }

  if (!body.midia_id) return json({ ok: false, error: 'midia_id obrigatório' }, 400)

  // 1. Buscar mídia
  const { data: midia, error: midiaErr } = await supabase
    .from('passagem_bastao_midias')
    .select('id,lead_id,tipo,nome_arquivo,storage_path,mime_type,enviado_slack_em')
    .eq('id', body.midia_id)
    .maybeSingle()

  if (midiaErr || !midia) return json({ ok: false, error: 'mídia não encontrada' }, 404)
  if (midia.enviado_slack_em) return json({ ok: true, skipped: 'já enviada' })

  // 2. Buscar thread_ts da notificação principal
  const { data: notif } = await supabase
    .from('notificacoes_ddgd')
    .select('slack_ts,slack_channel,status')
    .eq('lead_id', midia.lead_id)
    .maybeSingle()

  if (!notif || !notif.slack_ts || notif.status !== 'enviado') {
    await supabase
      .from('passagem_bastao_midias')
      .update({ erro_slack: 'lead ainda não foi notificado à DDGD (coloque em Ganho primeiro)' })
      .eq('id', midia.id)
    return json({ ok: false, error: 'lead ainda não está em Ganho ou notificação não foi enviada' }, 409)
  }

  const channel = notif.slack_channel ?? SLACK_CHANNEL_ID

  // 3. Baixar arquivo do Storage
  const { data: fileData, error: dlErr } = await supabase.storage.from(BUCKET).download(midia.storage_path)
  if (dlErr || !fileData) {
    const msg = dlErr?.message ?? 'download falhou'
    await supabase.from('passagem_bastao_midias').update({ erro_slack: msg }).eq('id', midia.id)
    return json({ ok: false, error: msg }, 500)
  }

  const size = fileData.size
  const buffer = await fileData.arrayBuffer()

  // 4. files.getUploadURLExternal (API moderna v2)
  const getUrlRes = await slackApi(
    `files.getUploadURLExternal?filename=${encodeURIComponent(midia.nome_arquivo)}&length=${size}`,
    { method: 'GET' },
  )

  if (!getUrlRes.ok) {
    const msg = `files.getUploadURLExternal falhou: ${getUrlRes.error ?? 'unknown'}`
    await supabase.from('passagem_bastao_midias').update({ erro_slack: msg }).eq('id', midia.id)
    return json({ ok: false, error: msg }, 502)
  }

  const uploadUrl = getUrlRes.upload_url as string
  const fileId = getUrlRes.file_id as string

  // 5. PUT do conteúdo para a URL retornada
  const putRes = await fetch(uploadUrl, {
    method: 'POST',
    body: new Uint8Array(buffer),
  })
  if (!putRes.ok) {
    const msg = `upload falhou: HTTP ${putRes.status}`
    await supabase.from('passagem_bastao_midias').update({ erro_slack: msg }).eq('id', midia.id)
    return json({ ok: false, error: msg }, 502)
  }

  // 6. completeUploadExternal → publica na thread do canal
  const title = `${midia.tipo === 'video' ? 'Vídeo' : 'Áudio'} do Closer — ${midia.nome_arquivo}`

  const completeRes = await slackApi('files.completeUploadExternal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      files: [{ id: fileId, title }],
      channel_id: channel,
      thread_ts: notif.slack_ts,
      initial_comment: `📎 Nova mídia do dossiê: *${midia.nome_arquivo}*`,
    }),
  })

  if (!completeRes.ok) {
    const msg = `completeUploadExternal falhou: ${completeRes.error ?? 'unknown'}`
    await supabase.from('passagem_bastao_midias').update({ erro_slack: msg }).eq('id', midia.id)
    return json({ ok: false, error: msg }, 502)
  }

  const files = (completeRes.files as { id: string; permalink?: string }[] | undefined) ?? []
  const permalink = files[0]?.permalink ?? null

  await supabase
    .from('passagem_bastao_midias')
    .update({
      slack_file_id: fileId,
      slack_permalink: permalink,
      enviado_slack_em: new Date().toISOString(),
      erro_slack: null,
    })
    .eq('id', midia.id)

  return json({ ok: true, permalink })
})
