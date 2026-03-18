import { useState } from 'react'
import { useContratos, useUpdateContrato } from '@/hooks/useContratos'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { Progress } from '@/components/ui/progress'
import { CONTRACT_TYPES, PRICING_MODELS, RM_STATUS_OPTIONS } from '@/lib/constants'
import { formatDate, formatCurrency, getContractProgress, getDaysUntilExpiry } from '@/lib/utils'
import { Search, AlertCircle, X, Pencil, Save, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Contrato } from '@/types'
import { toast } from 'sonner'

function ContratoModal({ contrato, onClose }: { contrato: Contrato; onClose: () => void }) {
  const update = useUpdateContrato()
  const [editing, setEditing] = useState(false)
  const [tipo, setTipo] = useState(contrato.tipo)
  const [modelo, setModelo] = useState(contrato.modelo_precificacao)
  const [valorTotal, setValorTotal] = useState(String(contrato.valor_total ?? ''))
  const [valorMensal, setValorMensal] = useState(String(contrato.valor_mensal ?? ''))
  const [dataInicio, setDataInicio] = useState(contrato.data_inicio?.slice(0, 10) ?? '')
  const [dataFim, setDataFim] = useState(contrato.data_fim?.slice(0, 10) ?? '')
  const [rmStatus, setRmStatus] = useState(contrato.rm_status)
  const [notas, setNotas] = useState(contrato.notas ?? '')

  const daysLeft = getDaysUntilExpiry(contrato.data_fim)
  const progress = getContractProgress(contrato.data_inicio, contrato.data_fim)
  const rmInfo = RM_STATUS_OPTIONS.find(r => r.value === contrato.rm_status)

  async function handleSave() {
    try {
      await update.mutateAsync({
        id: contrato.id,
        tipo,
        modelo_precificacao: modelo,
        valor_total: valorTotal ? parseFloat(valorTotal) : undefined,
        valor_mensal: valorMensal ? parseFloat(valorMensal) : undefined,
        data_inicio: dataInicio || undefined,
        data_fim: dataFim || undefined,
        rm_status: rmStatus,
        notas: notas || undefined,
      })
      toast.success('Contrato atualizado!')
      setEditing(false)
    } catch { toast.error('Erro ao salvar') }
  }

  const field = (label: string, value: React.ReactNode) => (
    <div>
      <p className="text-xs font-medium text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm text-slate-800">{value || '—'}</p>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">{contrato.cliente?.nome}</h2>
            <p className="text-sm text-slate-500">{contrato.cliente?.empresa}</p>
          </div>
          <div className="flex items-center gap-2">
            {!editing ? (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm text-slate-600 hover:bg-slate-50">
                <Pencil className="w-3.5 h-3.5" />Editar
              </button>
            ) : (
              <button onClick={handleSave} disabled={update.isPending} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white font-medium" style={{ backgroundColor: '#0089ac' }}>
                <Save className="w-3.5 h-3.5" />{update.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span>{formatDate(contrato.data_inicio)}</span>
              <span className="font-medium text-slate-600">{progress}% concluído</span>
              <span>{formatDate(contrato.data_fim)}</span>
            </div>
            <Progress value={progress} className="h-2" />
            {daysLeft !== null && daysLeft <= 30 && (
              <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />{daysLeft} dias para vencer
              </p>
            )}
          </div>

          {/* Info grid */}
          {!editing ? (
            <div className="grid grid-cols-2 gap-4">
              {field('Tipo', CONTRACT_TYPES.find(t => t.value === contrato.tipo)?.label)}
              {field('Modelo', PRICING_MODELS.find(m => m.value === contrato.modelo_precificacao)?.label)}
              {field('Valor Total', contrato.valor_total ? formatCurrency(contrato.valor_total) : null)}
              {field('Valor Mensal', contrato.valor_mensal ? formatCurrency(contrato.valor_mensal) : null)}
              {field('Início', formatDate(contrato.data_inicio))}
              {field('Término', formatDate(contrato.data_fim))}
              {field('Status RM', rmInfo?.label)}
              {field('Áreas', contrato.areas_direito?.join(', '))}
              {contrato.notas && <div className="col-span-2">{field('Notas', contrato.notas)}</div>}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Tipo', value: tipo, setter: setTipo, options: CONTRACT_TYPES },
                { label: 'Modelo', value: modelo, setter: setModelo, options: PRICING_MODELS },
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
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Notas</label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function ContratosPage() {
  const { data: contratos, isLoading } = useContratos()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Contrato | null>(null)

  const filtered = contratos?.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.cliente?.nome?.toLowerCase().includes(q) || c.cliente?.empresa?.toLowerCase().includes(q)
  }) || []

  const expiringSoon = filtered.filter(c => {
    const d = getDaysUntilExpiry(c.data_fim)
    return d !== null && d <= 30 && d >= 0
  })

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Contratos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Acompanhe contratos, prazos e status de Registro de Marca</p>
        </div>
        <Badge variant="secondary" className="shrink-0 mt-1">{filtered.length} contrato{filtered.length !== 1 ? 's' : ''}</Badge>
      </div>

      {expiringSoon.length > 0 && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
          <p className="text-sm text-orange-700">
            <strong>{expiringSoon.length} contrato(s)</strong> vence{expiringSoon.length === 1 ? '' : 'm'} nos próximos 30 dias.
          </p>
        </div>
      )}

      <div className="relative max-w-xs mb-5">
        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
        <Input placeholder="Buscar por cliente..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-48" />
                  <div className="h-3 bg-slate-100 rounded w-64" />
                  <div className="h-2 bg-slate-100 rounded w-full mt-3" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-4 bg-slate-200 rounded w-20" />
                  <div className="h-3 bg-slate-100 rounded w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <EmptyState
              icon={FileText}
              title={search ? 'Nenhum contrato encontrado' : 'Nenhum contrato cadastrado'}
              description={
                search
                  ? `Não encontramos contratos para "${search}".`
                  : 'Os contratos criados a partir de oportunidades convertidas aparecerão aqui.'
              }
            />
          )}
          {filtered.map(contrato => {
            const daysLeft = getDaysUntilExpiry(contrato.data_fim)
            const progress = getContractProgress(contrato.data_inicio, contrato.data_fim)
            const isExpiring = daysLeft !== null && daysLeft <= 30 && daysLeft >= 0
            const rmInfo = RM_STATUS_OPTIONS.find(r => r.value === contrato.rm_status)

            return (
              <Card key={contrato.id}
                className={cn('cursor-pointer hover:shadow-md transition-shadow', isExpiring && 'border-orange-200 bg-orange-50/30')}
                onClick={() => setSelected(contrato)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-slate-800">{contrato.cliente?.nome} — {contrato.cliente?.empresa}</p>
                        {isExpiring && (
                          <span className="text-xs text-orange-600 font-medium flex items-center gap-0.5">
                            <AlertCircle className="w-3 h-3" /> {daysLeft}d
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">
                        {CONTRACT_TYPES.find(t => t.value === contrato.tipo)?.label} · {PRICING_MODELS.find(m => m.value === contrato.modelo_precificacao)?.label}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {contrato.areas_direito?.map(a => (
                          <span key={a} className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{a.replace(/_/g, ' ')}</span>
                        ))}
                      </div>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>{formatDate(contrato.data_inicio)}</span>
                          <span>{formatDate(contrato.data_fim)}</span>
                        </div>
                        <Progress value={progress} className={cn('h-1.5', isExpiring && '[&>div]:bg-orange-500')} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {contrato.valor_total && <p className="font-bold text-slate-800">{formatCurrency(contrato.valor_total)}</p>}
                      {rmInfo && <span className={cn('text-xs px-1.5 py-0.5 rounded border block mt-1', rmInfo.color)}>RM: {rmInfo.label}</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {selected && <ContratoModal contrato={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
