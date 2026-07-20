// Edge Function: google-calendar-disconnect
// Chamada pelo frontend. Revoga o token no Google (best-effort), apaga a linha
// de google_calendar_connections e zera o status em perfis.
//
// Requer secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { revokeToken } from '../_shared/google-calendar.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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

  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  const { data: { user }, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !user) return json({ ok: false, error: 'unauthorized' }, 401)

  try {
    const { data: conn } = await supabase
      .from('google_calendar_connections')
      .select('refresh_token')
      .eq('perfil_id', user.id)
      .maybeSingle()

    if (conn?.refresh_token) await revokeToken(conn.refresh_token)

    await supabase.from('google_calendar_connections').delete().eq('perfil_id', user.id)
    await supabase
      .from('perfis')
      .update({ google_calendar_conectado: false, google_calendar_email: null })
      .eq('id', user.id)

    return json({ ok: true })
  } catch (e) {
    console.error('[google-calendar-disconnect]', String(e))
    return json({ ok: false, error: String((e as Error).message ?? e) }, 500)
  }
})
