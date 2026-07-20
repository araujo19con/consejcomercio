import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useMeuPerfil } from './usePerfis'

// Client ID público do OAuth (não é segredo). Configurado no Vercel.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

// Escopos mínimos: cria/gerencia SÓ o calendário criado pelo app (calendar.app.created)
// + email para identificar a conta. Não toca na agenda principal do usuário.
const SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/calendar.app.created'].join(' ')

export function googleCalendarRedirectUri(): string {
  return `${window.location.origin}/me/google-callback`
}

// Monta a URL de consentimento do Google. access_type=offline + prompt=consent
// garantem o refresh_token (necessário para o sync recorrente no backend).
export function buildGoogleAuthUrl(): string | null {
  if (!GOOGLE_CLIENT_ID) return null
  const state = crypto.randomUUID()
  sessionStorage.setItem('gcal_oauth_state', state)
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: googleCalendarRedirectUri(),
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export function useGoogleCalendarStatus() {
  const { data: perfil, isLoading } = useMeuPerfil()
  return {
    isLoading,
    conectado: perfil?.google_calendar_conectado ?? false,
    email: perfil?.google_calendar_email ?? null,
    configurado: !!GOOGLE_CLIENT_ID,
  }
}

export function useConnectGoogleCalendar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ code, redirectUri }: { code: string; redirectUri: string }) => {
      const { data, error } = await supabase.functions.invoke('google-calendar-connect', {
        body: { code, redirectUri },
      })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.error ?? 'Falha ao conectar Google Agenda')
      return data as { ok: true; email: string | null }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['perfil-meu'] })
      qc.invalidateQueries({ queryKey: ['perfis'] })
    },
  })
}

export function useDisconnectGoogleCalendar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('google-calendar-disconnect', { body: {} })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.error ?? 'Falha ao desconectar')
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['perfil-meu'] })
      qc.invalidateQueries({ queryKey: ['perfis'] })
    },
  })
}
