import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, Video, MapPin, ExternalLink } from 'lucide-react'
import { useReunioes } from '@/hooks/useReunioes'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { differenceInHours } from 'date-fns'

type Props = { userId: string }

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  agendada:  { bg: 'rgba(0,137,172,0.12)',  color: '#6bd0e7', label: 'Agendada'  },
  realizada: { bg: 'rgba(16,185,129,0.12)', color: '#6ee7b7', label: 'Realizada' },
  cancelada: { bg: 'rgba(239,68,68,0.12)',  color: '#fca5a5', label: 'Cancelada' },
}

export function MinhaAgendaPanel({ userId }: Props) {
  const navigate = useNavigate()
  const { data: reunioes = [] } = useReunioes()

  const agora = new Date()

  // Minhas reuniões = onde sou responsável (MVP; participantes como string[] não é FK)
  const minhas = useMemo(
    () => reunioes.filter(r => r.responsavel_id === userId),
    [reunioes, userId],
  )

  const proximas = minhas
    .filter(r => r.status === 'agendada' && new Date(r.data_hora) >= agora)
    .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())

  const passadas = minhas
    .filter(r => r.status !== 'agendada' || new Date(r.data_hora) < agora)
    .sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime())
    .slice(0, 10)

  const hojeCount = proximas.filter(r => {
    const d = new Date(r.data_hora)
    return d.toDateString() === agora.toDateString()
  }).length

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-2xl font-bold text-foreground">{hojeCount}</p>
          <p className="text-xs text-muted-foreground">hoje</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-2xl font-bold text-foreground">{proximas.length}</p>
          <p className="text-xs text-muted-foreground">próximas</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-2xl font-bold text-foreground">{minhas.filter(r => r.status === 'realizada').length}</p>
          <p className="text-xs text-muted-foreground">realizadas</p>
        </CardContent></Card>
      </div>

      {/* Próximas */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold text-foreground">Próximas reuniões</h3>
          <Button size="sm" variant="outline" onClick={() => navigate('/reunioes')} className="h-7 text-xs">
            Ver agenda completa <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        </div>

        {proximas.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma reunião agendada.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y" style={{ borderColor: 'var(--alpha-border)' }}>
                {proximas.map(r => {
                  const data = new Date(r.data_hora)
                  const horas = differenceInHours(data, agora)
                  const iminente = horas <= 24
                  const st = STATUS_STYLE[r.status]
                  return (
                    <div key={r.id} className="px-4 py-3 flex items-start gap-3 hover:bg-[var(--alpha-bg-xs)] transition-colors">
                      <div className={cn('w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0 text-xs font-semibold',
                        iminente ? 'border-2' : 'border')}
                        style={iminente
                          ? { background: 'rgba(249,115,22,0.15)', borderColor: '#fdba74', color: '#fdba74' }
                          : { background: 'var(--alpha-bg-sm)', borderColor: 'var(--alpha-border)', color: 'var(--text-soft-a)' }
                        }>
                        <span>{data.toLocaleDateString('pt-BR', { day: '2-digit' })}</span>
                        <span className="text-[9px] uppercase">{data.toLocaleDateString('pt-BR', { month: 'short' })}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{r.titulo}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {r.duracao_minutos}min</span>
                          {r.link_video && <a href={r.link_video} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-fg2"><Video className="w-3 h-3" />Vídeo</a>}
                          {r.local && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.local}</span>}
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0" style={{ background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Histórico recente */}
      {passadas.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground px-1">Histórico recente</h3>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y" style={{ borderColor: 'var(--alpha-border)' }}>
                {passadas.map(r => {
                  const data = new Date(r.data_hora)
                  const st = STATUS_STYLE[r.status]
                  return (
                    <div key={r.id} className="px-4 py-2.5 flex items-center gap-3">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <p className="flex-1 text-sm text-fg2 truncate">{r.titulo}</p>
                      <span className="text-xs text-muted-foreground shrink-0">{data.toLocaleDateString('pt-BR')}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0" style={{ background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
