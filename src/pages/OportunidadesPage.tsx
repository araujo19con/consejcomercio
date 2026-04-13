import { useState } from 'react'
import { useOportunidades, useCreateOportunidade, useUpdateOportunidade } from '@/hooks/useOportunidades'
import { useCreateContrato } from '@/hooks/useContratos'
import { useClientes } from '@/hooks/useClientes'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OPORTUNIDADE_STATUS, OPORTUNIDADE_TIPOS, CONTRACT_TYPES, PRICING_MODELS, SERVICE_AREAS, RM_STATUS_OPTIONS } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import { TrendingUp, RefreshCw, ArrowUpRight, Save, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Oportunidade } from '@/types'
import { toast } from 'sonner'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function OportunidadesSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="w-72 shrink-0">
          <div className="h-5 bg-[rgba(255,255,255,0.07)] rounded w-28 mb-3 animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: i % 2 === 0 ? 2 : 1 }).map((_, j) => (
              <div key={j} className="bg-card rounded-xl p-3 animate-pulse space-y-2" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="h-4 bg-[rgba(255,255,255,0.04)] rounded w-20" />
                <div className="h-4 bg-[rgba(255,255,255,0.07)] rounded w-full" />
                <div className="h-3 bg-[rgba(255,255,255,0.04)] rounded w-24" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const TIPO_ICONS = { upsell: ArrowUpRight, cross_sell: TrendingUp, renovacao: RefreshCw }
const TIPO_COLORS: Record<string, string> = {
  upsell: 'bg-[rgba(139,92,246,0.15)] text-[#a78bfa]',
  cross_sell: 'bg-[rgba(59,130,246,0.15)] text-[#93c5fd]',
  renovacao: 'bg-[rgba(245,158,11,0.15)] text-[#fbbf24]',
}

function NovoContratoModal({ op, onClose }: { op: Oportunidade; onClose: () => void }) {
  const createContrato = useCreateContrato()
  const updateOportunidade = useUpdateOportunidade()

  const [tipo, setTipo] = useState('assessoria')
  const [modelo, setModelo] = useState('assessoria_12m')
  const [valorTotal, setValorTotal] = useState(String(op.valor_estimado ?? ''))
  const [valorMensal, setValorMensal] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [rmStatus, setRmStatus] = useState('nao_aplicavel')
  const [notas, setNotas] = useState(op.descricao ?? '')
  const [areas, setAreas] = useState<string[]>([])

  function toggleArea(area: string) {
    setAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area])
  }

  async function handleSave() {
    try {
      const contrato = await createContrato.mutateAsync({
        cliente_id: op.cliente_id,
        tipo,
        modelo_precificacao: modelo,
        areas_direito: areas,
        valor_total: valorTotal ? parseFloat(valorTotal) : undefined,
        valor_mensal: valorMensal ? parseFloat(valorMensal) : undefined,
        data_inicio: dataInicio || undefined,
        data_fim: dataFim || undefined,
        status: 'ativo',
        rm_status: rmStatus,
        notas: notas || undefined,
      })
      // Link contrato to opportunity and mark as convertida
      await updateOportunidade.mutateAsync({ id: op.id, status: 'convertida', contrato_id: contrato.id })
      toast.success('Contrato criado e oportunidade convertida!')
      onClose()
    } catch {
      toast.error('Erro ao criar contrato')
    }
  }

  const isPending = createContrato.isPending || updateOportunidade.isPending

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 flex flex-col max-h-[90vh] overflow-hidden gap-0">
        <div className="px-6 py-4 border-b shrink-0">
          <h2 className="text-lg font-semibold text-[rgba(230,235,240,0.92)]">Novo Contrato — Oportunidade Convertida</h2>
          <p className="text-sm text-[rgba(130,150,170,0.65)]">{op.titulo} · {op.cliente?.nome}</p>
        </div>

        <div className="overflow-y-auto p-6 space-y-5 flex-1">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Tipo de Contrato', value: tipo, setter: setTipo, options: CONTRACT_TYPES },
              { label: 'Modelo de Precificação', value: modelo, setter: setModelo, options: PRICING_MODELS },
            ].map(({ label, value, setter, options }) => (
              <div key={label}>
                <label className="block text-xs font-medium text-[rgba(130,150,170,0.65)] mb-1">{label}</label>
                <select value={value} onChange={e => setter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            ))}

            {[
              { label: 'Valor Total (R$)', value: valorTotal, setter: setValorTotal },
              { label: 'Valor Mensal (R$)', value: valorMensal, setter: setValorMensal },
              { label: 'Data Início', value: dataInicio, setter: setDataInicio, type: 'date' },
              { label: 'Data Término', value: dataFim, setter: setDataFim, type: 'date' },
            ].map(({ label, value, setter, type }) => (
              <div key={label}>
                <label className="block text-xs font-medium text-[rgba(130,150,170,0.65)] mb-1">{label}</label>
                <input type={type ?? 'text'} value={value} onChange={e => setter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}

            <div>
              <label className="block text-xs font-medium text-[rgba(130,150,170,0.65)] mb-1">Status RM</label>
              <select value={rmStatus} onChange={e => setRmStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {RM_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Áreas de direito */}
          <div>
            <label className="block text-xs font-medium text-[rgba(130,150,170,0.65)] mb-2">Áreas de Direito</label>
            <div className="flex flex-wrap gap-2">
              {SERVICE_AREAS.map(a => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => toggleArea(a.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    areas.includes(a.value)
                      ? 'text-white border-primary bg-primary'
                      : 'bg-[rgba(255,255,255,0.04)] text-[rgba(150,165,180,0.70)] border-[rgba(255,255,255,0.10)] hover:border-primary/50'
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[rgba(130,150,170,0.65)] mb-1">Notas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t shrink-0">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-[rgba(150,165,180,0.70)] hover:bg-background">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm text-white font-medium disabled:opacity-50"
            style={{ backgroundColor: '#0089ac' }}>
            <Save className="w-4 h-4" />
            {isPending ? 'Salvando...' : 'Criar Contrato'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function NovaOportunidadeModal({ onClose }: { onClose: () => void }) {
  const { data: clientes = [] } = useClientes()
  const create = useCreateOportunidade()

  const [clienteId, setClienteId] = useState('')
  const [tipo, setTipo] = useState('upsell')
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valorEstimado, setValorEstimado] = useState('')
  const [dataAlerta, setDataAlerta] = useState('')

  async function handleSave() {
    if (!clienteId || !titulo) { toast.error('Cliente e título são obrigatórios'); return }
    await create.mutateAsync({
      cliente_id: clienteId,
      tipo,
      titulo,
      descricao: descricao || undefined,
      servico_alvo: titulo.toLowerCase().replace(/\s+/g, '_').slice(0, 40),
      status: 'identificada',
      valor_estimado: valorEstimado ? parseFloat(valorEstimado) : undefined,
      data_alerta: dataAlerta || undefined,
    })
    onClose()
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-[rgba(230,235,240,0.92)]">Nova Oportunidade</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[rgba(130,150,170,0.65)] mb-1">Cliente *</label>
            <select value={clienteId} onChange={e => setClienteId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione o cliente</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome} — {c.empresa}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[rgba(130,150,170,0.65)] mb-1">Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {OPORTUNIDADE_TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[rgba(130,150,170,0.65)] mb-1">Título *</label>
            <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Renovação de contrato anual"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[rgba(130,150,170,0.65)] mb-1">Descrição</label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[rgba(130,150,170,0.65)] mb-1">Valor Estimado (R$)</label>
              <input type="number" value={valorEstimado} onChange={e => setValorEstimado(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[rgba(130,150,170,0.65)] mb-1">Data de Alerta</label>
              <input type="date" value={dataAlerta} onChange={e => setDataAlerta(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-[rgba(150,165,180,0.70)] hover:bg-background">Cancelar</button>
          <button onClick={handleSave} disabled={create.isPending || !clienteId || !titulo}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm text-white font-medium disabled:opacity-50"
            style={{ backgroundColor: '#0089ac' }}>
            <Save className="w-4 h-4" />{create.isPending ? 'Salvando...' : 'Criar'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function OportunidadesPage() {
  const { data: oportunidades, isLoading } = useOportunidades()
  const updateOportunidade = useUpdateOportunidade()
  const [convertendo, setConvertendo] = useState<Oportunidade | null>(null)
  const [showNova, setShowNova] = useState(false)

  function handleStatusChange(op: Oportunidade, newStatus: string) {
    if (newStatus === 'convertida') {
      setConvertendo(op)
      return
    }
    updateOportunidade.mutate({ id: op.id, status: newStatus })
  }

  const byStatus = OPORTUNIDADE_STATUS.reduce((acc, s) => {
    acc[s.value] = oportunidades?.filter(o => o.status === s.value) || []
    return acc
  }, {} as Record<string, typeof oportunidades extends undefined ? never[] : NonNullable<typeof oportunidades>>)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[rgba(230,235,240,0.92)]">Oportunidades</h1>
        <button onClick={() => setShowNova(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-sm font-medium"
          style={{ backgroundColor: '#0089ac' }}>
          <Plus className="w-4 h-4" />Nova Oportunidade
        </button>
      </div>

      {isLoading ? <OportunidadesSkeleton /> : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {OPORTUNIDADE_STATUS.filter(s => s.value !== 'descartada').map(statusInfo => {
            const items = byStatus[statusInfo.value] || []
            const totalValor = items.reduce((sum, op) => sum + (op.valor_estimado ?? 0), 0)
            return (
              <div key={statusInfo.value} className="w-72 shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[rgba(215,225,235,0.85)]">{statusInfo.label}</h3>
                  <div className="flex items-center gap-1.5">
                    {totalValor > 0 && (
                      <span className="text-[10px] text-[rgba(100,120,140,0.55)] font-medium">{formatCurrency(totalValor)}</span>
                    )}
                    <span className="text-xs font-bold text-[rgba(200,215,225,0.70)] rounded-full px-1.5 py-0.5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>{items.length}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {items.map(op => {
                    const Icon = TIPO_ICONS[op.tipo as keyof typeof TIPO_ICONS] || TrendingUp
                    return (
                      <Card key={op.id} className="shadow-sm">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1', TIPO_COLORS[op.tipo])}>
                              <Icon className="w-3 h-3" />
                              {OPORTUNIDADE_TIPOS.find(t => t.value === op.tipo)?.label}
                            </span>
                            {op.valor_estimado && <span className="text-xs font-semibold text-[rgba(215,225,235,0.85)]">{formatCurrency(op.valor_estimado)}</span>}
                          </div>
                          <p className="text-sm font-medium text-[rgba(230,235,240,0.92)] leading-tight">{op.titulo}</p>
                          <p className="text-xs text-[rgba(130,150,170,0.65)] mt-0.5">{op.cliente?.nome}</p>
                          {op.data_alerta && <p className="text-xs text-orange-600 mt-1">Alerta: {formatDate(op.data_alerta)}</p>}
                          <div className="mt-2">
                            <Select value={op.status} onValueChange={v => handleStatusChange(op, v)}>
                              <SelectTrigger className="h-6 text-xs w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {OPORTUNIDADE_STATUS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                  {items.length === 0 && (
                    <div className="text-center py-6 px-3 border-2 border-dashed border-slate-100 rounded-xl">
                      <p className="text-xs text-[rgba(100,120,140,0.55)]">
                        {statusInfo.value === 'identificada' ? 'Nenhuma oportunidade ainda' : 'Nenhum item aqui'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {convertendo && (
        <NovoContratoModal
          op={convertendo}
          onClose={() => setConvertendo(null)}
        />
      )}

      {showNova && <NovaOportunidadeModal onClose={() => setShowNova(false)} />}
    </div>
  )
}
