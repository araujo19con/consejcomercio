// Edge Function: google-calendar-connect
// Chamada pelo frontend (supabase.functions.invoke) na volta do OAuth do Google.
// Recebe o authorization `code`, troca por tokens, cria o calendário dedicado
// "CONSEJ Follow-ups" (ou reusa o existente), e persiste o refresh_token na
// tabela lockada google_calendar_connections. Marca perfis.google_calendar_conectado.
//
// Requer secrets: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET,
//                 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { exchangeCode, getUserEmail, createCalendar } from '../_shared/google-calendar.ts'

const CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!
const CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CALENDAR_NAME = 'CONSEJ Follow-ups'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405)

  // ─── Identifica o consultor pelo JWT do Supabase ───────────────────────────
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  const { data: { user }, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !user) return json({ ok: false, error: 'unauthorized' }, 401)

  let payload: { code?: string; redirectUri?: string }
  try {
    payload = await req.json()
  } catch {
    return json({ ok: false, error: 'invalid JSON' }, 400)
  }
  const { code, redirectUri } = payload
  if (!code || !redirectUri) return json({ ok: false, error: 'code/redirectUri ausentes' }, 400)

  try {
    // 1. code → tokens (precisa access_type=offline + prompt=consent na auth URL)
    const tokens = await exchangeCode(CLIENT_ID, CLIENT_SECRET, code, redirectUri)

    // 2. e-mail Google do consultor
    const googleEmail = await getUserEmail(tokens.access_token)

    // 3. Reusar conexão existente (evita criar calendário duplicado em reconexão)
    const { data: existing } = await supabase
      .from('google_calendar_connections')
      .select('calendar_id, refresh_token')
      .eq('perfil_id', user.id)
      .maybeSingle()

    let calendarId = existing?.calendar_id ?? null
    if (!calendarId) {
      calendarId = await createCalendar(tokens.access_token, CALENDAR_NAME)
    }

    // Google só devolve refresh_token no 1º consent — se faltar, mantém o antigo
    const refreshToken = tokens.refresh_token ?? existing?.refresh_token
    if (!refreshToken) {
      return json({
        ok: false,
        error: 'Google não retornou refresh_token. Reconecte forçando o consentimento (prompt=consent).',
      }, 400)
    }

    // 4. Persiste (service_role bypassa RLS da tabela lockada)
    const { error: upsertErr } = await supabase
      .from('google_calendar_connections')
      .upsert({
        perfil_id: user.id,
        refresh_token: refreshToken,
        calendar_id: calendarId,
        google_email: googleEmail,
        scope: tokens.scope,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'perfil_id' })
    if (upsertErr) throw new Error(`persist connection: ${upsertErr.message}`)

    // 5. Status legível pela UI
    await supabase
      .from('perfis')
      .update({ google_calendar_conectado: true, google_calendar_email: googleEmail })
      .eq('id', user.id)

    return json({ ok: true, email: googleEmail })
  } catch (e) {
    console.error('[google-calendar-connect]', String(e))
    return json({ ok: false, error: String((e as Error).message ?? e) }, 500)
  }
})
