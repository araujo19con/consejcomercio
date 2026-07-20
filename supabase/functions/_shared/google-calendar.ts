// Shared helper: cliente REST do Google (OAuth2 + Calendar API v3) para Deno Edge.
// Sem lib googleapis — só fetch. Usado por google-calendar-connect,
// google-calendar-disconnect e sync-calendar.
//
// @ts-nocheck (globals Deno/fetch não resolvem no TS Node; Deno resolve em prod)

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'
const CAL_BASE = 'https://www.googleapis.com/calendar/v3'

export const TIMEZONE = 'America/Sao_Paulo'

export interface GoogleTokens {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope: string
  token_type: string
}

// Troca o authorization code por tokens (fluxo OAuth inicial — connect)
export async function exchangeCode(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string,
): Promise<GoogleTokens> {
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!r.ok) throw new Error(`exchangeCode ${r.status}: ${await r.text()}`)
  return await r.json()
}

// Renova o access_token a partir do refresh_token (uso recorrente no sync)
export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<string> {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!r.ok) throw new Error(`refreshAccessToken ${r.status}: ${await r.text()}`)
  const j = await r.json()
  return j.access_token as string
}

export async function getUserEmail(accessToken: string): Promise<string | null> {
  const r = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!r.ok) return null
  const j = await r.json()
  return (j.email as string) ?? null
}

// Cria o calendário dedicado e retorna o id
export async function createCalendar(accessToken: string, summary: string): Promise<string> {
  const r = await fetch(`${CAL_BASE}/calendars`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ summary, timeZone: TIMEZONE }),
  })
  if (!r.ok) throw new Error(`createCalendar ${r.status}: ${await r.text()}`)
  const j = await r.json()
  return j.id as string
}

export interface CalendarEvent {
  summary: string
  description?: string
  location?: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  reminders?: { useDefault: boolean; overrides?: Array<{ method: string; minutes: number }> }
  attendees?: Array<{ email: string }>
}

// Insere um evento e retorna o eventId do Google
export async function insertEvent(
  accessToken: string,
  calendarId: string,
  event: CalendarEvent,
): Promise<string> {
  const r = await fetch(`${CAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  })
  if (!r.ok) throw new Error(`insertEvent ${r.status}: ${await r.text()}`)
  const j = await r.json()
  return j.id as string
}

// Atualiza (patch) um evento existente. Retorna false se o evento sumiu (404/410).
export async function patchEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: Partial<CalendarEvent>,
): Promise<boolean> {
  const r = await fetch(
    `${CAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    },
  )
  if (r.status === 404 || r.status === 410) return false // evento removido manualmente
  if (!r.ok) throw new Error(`patchEvent ${r.status}: ${await r.text()}`)
  return true
}

// Remove um evento (idempotente — 404/410 = já removido)
export async function deleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const r = await fetch(
    `${CAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!r.ok && r.status !== 404 && r.status !== 410) {
    throw new Error(`deleteEvent ${r.status}: ${await r.text()}`)
  }
}

// Revoga o token no Google (disconnect). Best-effort.
export async function revokeToken(token: string): Promise<void> {
  await fetch(`${REVOKE_URL}?token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  }).catch(() => {})
}
