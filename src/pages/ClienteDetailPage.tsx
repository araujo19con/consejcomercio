import { useParams, useNavigate } from 'react-router-dom'
import { useCliente } from '@/hooks/useClientes'
import { useContratosByCliente } from '@/hooks/useContratos'
import { useIndicacoes } from '@/hooks/useIndicacoes'
import { useOportunidades } from '@/hooks/useOportunidades'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Plus, AlertCircle } from 'lucide-react'
import { CONTRACT_TYPES, PRICING_MODELS, CLIENT_STATUS_OPTIONS, RM_STATUS_OPTIONS, OPORTUNIDADE_STATUS, SERVICE_AREAS } from '@/lib/constants'

const CONTRACT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ativo:     { label: 'Ativo',     color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  encerrado: { label: 'Encerrado', color: 'text-slate-500 bg-slate-50 border-slate-200' },
  suspenso:  { label: 'Suspenso',  color: 'text-amber-600 bg-amber-50 border-amber-200' },
}
import { formatDate, formatCurrency, getContractProgress, getDaysUntilExpiry } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { NewContratoModal } from '@/components/contratos/NewContratoModal'

export function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: cliente } = useCliente(id!)
  const { data: contratos } = useContratosByCliente(id!)
  const { data: todasIndicacoes } = useIndicacoes()
  const { data: todasOportunidades } = useOportunidades()
  const [showNewContrato, setShowNewContrato] = useState(false)

  const indicacoes = todasIndicacoes?.filter(i => i.indicante_cliente_id === id) || []
  const oportunidades = todasOportunidades?.filter(o => o.cliente_id === id) || []

  if (!cliente) return <div className="text-[rgba(130,150,170,0.65)]">Cliente não encontrado.</div>

  const statusInfo = CLIENT_STATUS_OPTIONS.find(s => s.value === cliente.status)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm mb-5">
        <button onClick={() => navigate('/clientes')} className="text-[rgba(100,120,140,0.55)] hover:text-[rgba(215,225,235,0.85)] transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Clientes
        </button>
        <span className="text-[rgba(80,100,120,0.50)]">/</span>
        <span className="text-[rgba(215,225,235,0.85)] font-medium truncate">{cliente.nome}</span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-[rgba(230,235,240,0.92)]">{cliente.nome}</h1>
          <p className="text-sm text-[rgba(130,150,170,0.65)]">{cliente.empresa}</p>
        </div>
        {statusInfo && (
          <span className={cn('ml-auto text-xs font-medium px-2.5 py-1 rounded-full', statusInfo.color)}>
            {statusInfo.label}
          </span>
        )}
      </div>

      <Tabs defaultValue="contratos">
        <TabsList className="mb-4">
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="contratos">Contratos ({contratos?.length || 0})</TabsTrigger>
          <TabsTrigger value="indicacoes">Indicações ({indicacoes.length})</TabsTrigger>
          <TabsTrigger value="oportunidades">Oportunidades ({oportunidades.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <Card>
            <CardContent className="p-5 grid grid-cols-2 gap-4">
              {[
                { label: 'Telefone', value: cliente.telefone },
                { label: 'Email', value: cliente.email },
                { label: 'Segmento', value: cliente.segmento?.replace(/_/g, ' ') },
                { label: 'Cliente desde', value: formatDate(cliente.created_at) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-[rgba(130,150,170,0.65)]">{label}</p>
                  <p className="text-sm font-medium text-[rgba(230,235,240,0.92)]">{value || '—'}</p>
                </div>
              ))}
              {cliente.notas && (
                <div className="col-span-2">
                  <p className="text-xs text-[rgba(130,150,170,0.65)]">Observações</p>
                  <p className="text-sm text-[rgba(215,225,235,0.85)] mt-0.5">{cliente.notas}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contratos">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setShowNewContrato(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="w-3.5 h-3.5 mr-1" /> Novo Contrato
            </Button>
          </div>
          <div className="space-y-3">
            {contratos?.map(contrato => {
              const daysLeft = getDaysUntilExpiry(contrato.data_fim)
              const progress = getContractProgress(contrato.data_inicio, contrato.data_fim)
              const isExpiring = daysLeft !== null && daysLeft <= 30 && daysLeft >= 0
              const rmInfo = RM_STATUS_OPTIONS.find(r => r.value === contrato.rm_status)

              const statusInfo = CONTRACT_STATUS_LABELS[contrato.status] ?? CONTRACT_STATUS_LABELS['ativo']

              return (
                <Card key={contrato.id} style={isExpiring ? { borderColor: 'rgba(249,115,22,0.35)' } : {}}>
                  <CardContent className="p-4 space-y-3">
                    {/* Header row */}
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-[rgba(230,235,240,0.92)]">
                          {CONTRACT_TYPES.find(t => t.value === contrato.tipo)?.label} — {PRICING_MODELS.find(m => m.value === contrato.modelo_precificacao)?.label}
                        </p>
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          {contrato.areas_direito?.map(a => (
                            <span key={a} className="text-xs bg-[rgba(255,255,255,0.04)] text-[rgba(150,165,180,0.70)] px-2 py-0.5 rounded-full border border-[rgba(255,255,255,0.06)]">
                              {SERVICE_AREAS.find(s => s.value === a)?.label ?? a.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0 ml-3">
                        <span className={cn('text-xs px-1.5 py-0.5 rounded border', statusInfo.color)}>{statusInfo.label}</span>
                        {rmInfo && <span className={cn('text-xs px-1.5 py-0.5 rounded border', rmInfo.color)}>RM: {rmInfo.label}</span>}
                      </div>
                    </div>

                    {/* Financial row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-[rgba(130,150,170,0.55)] mb-0.5">Valor Total</p>
                        <p className="text-sm font-bold text-[rgba(230,235,240,0.92)]">{contrato.valor_total ? formatCurrency(contrato.valor_total) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[rgba(130,150,170,0.55)] mb-0.5">Valor Mensal</p>
                        <p className="text-sm font-medium text-[rgba(215,225,235,0.85)]">{contrato.valor_mensal ? formatCurrency(contrato.valor_mensal) : '—'}</p>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-[rgba(130,150,170,0.65)]">
                        <span>{formatDate(contrato.data_inicio)} → {formatDate(contrato.data_fim)}</span>
                        {isExpiring && (
                          <span className="text-orange-500 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {daysLeft}d restantes
                          </span>
                        )}
                        {daysLeft !== null && daysLeft < 0 && (
                          <span className="text-red-500 font-medium text-xs">Expirado</span>
                        )}
                      </div>
                      <Progress value={progress} className={cn('h-1.5', isExpiring && '[&>div]:bg-orange-500')} />
                    </div>

                    {/* Notes */}
                    {contrato.notas && (
                      <div className="pt-1 border-t border-[rgba(255,255,255,0.05)]">
                        <p className="text-xs text-[rgba(130,150,170,0.55)] mb-0.5">Observações</p>
                        <p className="text-sm text-[rgba(190,205,220,0.75)] leading-relaxed">{contrato.notas}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
            {!contratos?.length && <div className="text-center text-[rgba(100,120,140,0.55)] py-8">Nenhum contrato cadastrado.</div>}
          </div>
          {showNewContrato && (
            <NewContratoModal clienteId={id!} open={showNewContrato} onClose={() => setShowNewContrato(false)} />
          )}
        </TabsContent>

        <TabsContent value="indicacoes">
          <div className="space-y-2">
            {indicacoes.map(ind => (
              <Card key={ind.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[rgba(230,235,240,0.92)]">{ind.indicado_nome}</p>
                      <p className="text-sm text-[rgba(130,150,170,0.65)]">{ind.indicado_empresa || '—'}</p>
                    </div>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full', ind.recompensa_entregue ? 'bg-[rgba(16,185,129,0.15)] text-[#34d399]' : 'bg-[rgba(245,158,11,0.15)] text-[#fbbf24]')}>
                      {ind.recompensa_entregue ? 'Recompensa entregue' : 'Recompensa pendente'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!indicacoes.length && <div className="text-center text-[rgba(100,120,140,0.55)] py-8">Nenhuma indicação feita.</div>}
          </div>
        </TabsContent>

        <TabsContent value="oportunidades">
          <div className="space-y-2">
            {oportunidades.map(op => {
              const statusInfo = OPORTUNIDADE_STATUS.find(s => s.value === op.status)
              return (
                <Card key={op.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[rgba(230,235,240,0.92)]">{op.titulo}</p>
                        <p className="text-xs text-[rgba(130,150,170,0.65)] capitalize">{op.tipo.replace('_', '-sell')} · {op.servico_alvo.replace(/_/g, ' ')}</p>
                      </div>
                      {statusInfo && (
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusInfo.color)}>
                          {statusInfo.label}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            {!oportunidades.length && <div className="text-center text-[rgba(100,120,140,0.55)] py-8">Nenhuma oportunidade identificada.</div>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
