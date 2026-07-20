import { Calendar, CheckCircle2, Link2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  buildGoogleAuthUrl,
  useGoogleCalendarStatus,
  useDisconnectGoogleCalendar,
} from '@/hooks/useGoogleCalendar'

export function GoogleAgendaCard() {
  const { conectado, email, configurado, isLoading } = useGoogleCalendarStatus()
  const disconnect = useDisconnectGoogleCalendar()

  function handleConnect() {
    const url = buildGoogleAuthUrl()
    if (!url) {
      toast.error('Integração Google não configurada (falta VITE_GOOGLE_CLIENT_ID).')
      return
    }
    window.location.href = url
  }

  function handleDisconnect() {
    disconnect.mutate(undefined, {
      onSuccess: () => toast.success('Google Agenda desconectada.'),
      onError: (e) => toast.error(`Erro ao desconectar: ${(e as Error).message}`),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="w-4 h-4" style={{ color: '#0089ac' }} /> Google Agenda
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Conecte sua conta Google e seus <strong>follow-ups, tarefas com prazo e reuniões</strong> entram
          automaticamente num calendário <strong>"CONSEJ Follow-ups"</strong> na sua agenda — criados,
          atualizados e cancelados junto com o CRM.
        </p>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> carregando…
          </div>
        ) : conectado ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-sm text-green-500">
              <CheckCircle2 className="w-4 h-4" /> Conectada{email ? ` — ${email}` : ''}
            </span>
            <Button
              variant="ghost"
              onClick={handleDisconnect}
              disabled={disconnect.isPending}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              {disconnect.isPending ? 'Desconectando…' : 'Desconectar'}
            </Button>
          </div>
        ) : (
          <Button onClick={handleConnect} disabled={!configurado} className="gap-1.5">
            <Link2 className="w-4 h-4" /> Conectar Google Agenda
          </Button>
        )}

        {!configurado && !isLoading && (
          <p className="text-xs text-amber-500">
            Integração ainda não habilitada pelo administrador (falta o setup no Google Cloud +
            VITE_GOOGLE_CLIENT_ID).
          </p>
        )}
      </CardContent>
    </Card>
  )
}
