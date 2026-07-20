import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useConnectGoogleCalendar, googleCalendarRedirectUri } from '@/hooks/useGoogleCalendar'

// Página de retorno do OAuth do Google. Troca o code por tokens via edge function
// e volta para /me?tab=agenda.
export function GoogleCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const connect = useConnectGoogleCalendar()
  const [error, setError] = useState<string | null>(null)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const err = params.get('error')
    const code = params.get('code')
    const state = params.get('state')
    const expected = sessionStorage.getItem('gcal_oauth_state')
    sessionStorage.removeItem('gcal_oauth_state')

    if (err) return setError(`O Google recusou a autorização: ${err}`)
    if (!code) return setError('Resposta sem código de autorização.')
    if (!state || state !== expected) {
      return setError('Verificação de segurança falhou (state inválido). Tente conectar de novo.')
    }

    connect.mutate(
      { code, redirectUri: googleCalendarRedirectUri() },
      {
        onSuccess: (d) => {
          toast.success(`Google Agenda conectada${d.email ? ` (${d.email})` : ''}!`)
          navigate('/me?tab=agenda', { replace: true })
        },
        onError: (e) => setError((e as Error).message),
      },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      {error ? (
        <div className="max-w-md text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <p className="text-sm text-foreground">Não foi possível conectar a Google Agenda.</p>
          <p className="text-xs text-muted-foreground break-words">{error}</p>
          <button
            onClick={() => navigate('/me?tab=agenda', { replace: true })}
            className="text-sm text-primary hover:underline"
          >
            Voltar ao Meu Espaço
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" /> Conectando sua Google Agenda…
        </div>
      )}
    </div>
  )
}
