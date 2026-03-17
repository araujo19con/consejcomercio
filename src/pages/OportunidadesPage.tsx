import { useState } from 'react'
import { useOportunidades, useUpdateOportunidade } from '@/hooks/useOportunidades'
import { useCreateContrato } from '@/hooks/useContratos'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OPORTUNIDADE_STATUS, OPORTUNIDADE_TIPOS, CONTRACT_TYPES, PRICING_MODELS, SERVICE_AREAS, RM_STATUS_OPTIONS } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import { TrendingUp, RefreshCw, ArrowUpRight, X, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Oportunidade } from '@/types'
import { toast } from 'sonner'

const TIPO_ICONS = { upsell: ArrowUpRight, cross_sell: TrendingUp, renovacao: RefreshCw }
const TIPO_COLORS: Record<string, string> = {
  upsell: 'bg-purple-100 text-purple-700',
  cross_sell: 'bg-blue-100 text-blue-700',
  renovacao: 'bg-amber-100 text-amber-700',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Novo Contrato — Oportunidade Convertida</h2>
            <p className="text-sm text-slate-500">{op.titulo} · {op.cliente?.nome}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Tipo de Contrato', value: tipo, setter: setTipo, options: CONTRACT_TYPES },
              { label: 'Modelo de Precificação', value: modelo, setter: setModelo, options: PRICING_MODELS },
            ].map(({ label, value, setter, options }) => (
              <div key={label}>
                <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
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
                <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
                <input type={type ?? 'text'} value={value} onChange={e => setter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Status RM</label>
              <select value={rmStatus} onChange={e => setRmStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {RM_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Áreas de direito */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Áreas de Direito</label>
            <div className="flex flex-wrap gap-2">
              {SERVICE_AREAS.map(a => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => toggleArea(a.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    areas.includes(a.value)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Notas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t shrink-0">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm text-white font-medium disabled:opacity-50"
            style={{ backgroundColor: '#0089ac' }}>
            <Save className="w-4 h-4" />
            {isPending ? 'Salvando...' : 'Criar Contrato'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function OportunidadesPage() {
  const { data: oportunidades, isLoading } = useOportunidades()
  const updateOportunidade = useUpdateOportunidade()
  const [convertendo, setConvertendo] = useState<Oportunidade | null>(null)

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
      <h1 className="text-xl font-bold text-slate-800 mb-6">Oportunidades</h1>

      {isLoading ? <div className="text-center text-slate-500 py-8">Carregando...</div> : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {OPORTUNIDADE_STATUS.filter(s => s.value !== 'descartada').map(statusInfo => {
            const items = byStatus[statusInfo.value] || []
            return (
              <div key={statusInfo.value} className="w-72 shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700">{statusInfo.label}</h3>
                  <span className="text-xs font-bold text-slate-400 bg-white rounded-full px-1.5 py-0.5 border">{items.length}</span>
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
                            {op.valor_estimado && <span className="text-xs font-semibold text-slate-700">{formatCurrency(op.valor_estimado)}</span>}
                          </div>
                          <p className="text-sm font-medium text-slate-800 leading-tight">{op.titulo}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{op.cliente?.nome}</p>
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
                  {items.length === 0 && <div className="text-xs text-slate-300 text-center py-4">Vazio</div>}
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
    </div>
  )
}
