import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLeads } from '@/hooks/useLeads'
import { useInteracoes } from '@/hooks/useInteracoes'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PIPELINE_STAGES, TERMINAL_STAGES, STAGE_COLORS } from '@/lib/constants'
import { daysSinceLastTouch, getCadenciaDueToday } from '@/lib/cadencia'
import { cn } from '@/lib/utils'
import { MessageCircle, ExternalLink, Send } from 'lucide-react'
import type { Lead } from '@/types'

type Props = { userId: string }

function stageLabel(id: string) {
  return PIPELINE_STAGES.find(s => s.id === id)?.label ?? id
}

export function MeusLeadsPanel({ userId }: Props) {
  const navigate = useNavigate()
  const { data: leads = [] } = useLeads()
  const { data: interacoes = [] } = useInteracoes()

  const meus = useMemo(
    () => leads.filter(l => l.responsavel_id === userId),
    [leads, userId],
  )

  const ativos = meus.filter(l => !(TERMINAL_STAGES as readonly string[]).includes(l.status))
  const ganhos = meus.filter(l => l.status === 'ganho_assessoria' || l.status === 'ganho_consultoria').length
  const perdidos = meus.filter(l => l.status === 'perdido' || l.status === 'cancelado').length

  // Agrupar ativos por stage (ordem do pipeline)
  const grupos = useMemo(() => {
    const map = new Map<string, Lead[]>()
    for (const l of ativos) {
      const arr = map.get(l.status) ?? []
      arr.push(l)
      map.set(l.status, arr)
    }
    return PIPELINE_STAGES
      .filter(s => !(TERMINAL_STAGES as readonly string[]).includes(s.id))
      .filter(s => map.has(s.id))
      .map(s => ({ stage: s, leads: map.get(s.id) ?? [] }))
  }, [ativos])

  return (
    <div className="space-y-4">
      {/* KPIs pessoais compactos */}
      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-2xl font-bold text-foreground">{meus.length}</p>
          <p className="text-xs text-muted-foreground">total</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-2xl font-bold text-foreground">{ativos.length}</p>
          <p className="text-xs text-muted-foreground">ativos</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-2xl font-bold" style={{ color: '#6ee7b7' }}>{ganhos}</p>
          <p className="text-xs text-muted-foreground">fechados</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-2xl font-bold" style={{ color: '#fca5a5' }}>{perdidos}</p>
          <p className="text-xs text-muted-foreground">perdidos</p>
        </CardContent></Card>
      </div>

      {grupos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Você ainda não tem leads atribuídos.
          </CardContent>
        </Card>
      ) : (
        grupos.map(({ stage, leads: grupoLeads }) => (
          <div key={stage.id} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded border', STAGE_COLORS[stage.id])}>
                {stage.label}
              </span>
              <span className="text-xs text-muted-foreground">{grupoLeads.length}</span>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y" style={{ borderColor: 'var(--alpha-border)' }}>
                  {grupoLeads.map(l => {
                    const inter = interacoes.filter(i => i.lead_id === l.id)
                    const dias = daysSinceLastTouch(l, inter)
                    const cadPoint = getCadenciaDueToday(l, inter)
                    return (
                      <div key={l.id} className="px-4 py-3 flex items-center gap-3 hover:bg-[var(--alpha-bg-xs)] transition-colors">
                        <button onClick={() => navigate(`/leads/${l.id}`)} className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-semibold text-foreground truncate">{l.nome}</p>
                          <p className="text-xs text-muted-foreground truncate">{l.empresa}</p>
                        </button>
                        <div className="shrink-0 text-right hidden sm:block">
                          <p className="text-[10px] text-fg4">sem contato</p>
                          <p className="text-xs font-medium text-fg2">há {dias}d</p>
                        </div>
                        {cadPoint && (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium hidden md:inline-flex items-center gap-1"
                            style={{ background: 'rgba(37,211,102,0.18)', color: '#4ade80' }}
                            title={`Cadência: ${cadPoint.descricao}`}
                          >
                            <Send className="w-2.5 h-2.5" /> {cadPoint.label}
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/mensagens?leadId=${l.id}&nome=${encodeURIComponent(l.nome)}&empresa=${encodeURIComponent(l.empresa ?? '')}`)}
                          className="h-7 gap-1 text-xs"
                        >
                          <MessageCircle className="w-3 h-3" />
                          Mensagem
                        </Button>
                        <button
                          onClick={() => navigate(`/leads/${l.id}`)}
                          title="Abrir lead"
                          className="p-1.5 rounded hover:bg-[var(--alpha-bg-sm)] text-muted-foreground hover:text-fg2 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        ))
      )}
    </div>
  )
}
