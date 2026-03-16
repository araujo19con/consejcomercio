import { useState } from 'react'
import { useContratos } from '@/hooks/useContratos'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { CONTRACT_TYPES, PRICING_MODELS, RM_STATUS_OPTIONS } from '@/lib/constants'
import { formatDate, formatCurrency, getContractProgress, getDaysUntilExpiry } from '@/lib/utils'
import { Search, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ContratosPage() {
  const { data: contratos, isLoading } = useContratos()
  const [search, setSearch] = useState('')

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-800">Contratos</h1>
        <Badge variant="secondary">{filtered.length} contrato(s)</Badge>
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

      {isLoading ? <div className="text-slate-500 text-sm py-8 text-center">Carregando...</div> : (
        <div className="space-y-2">
          {filtered.map(contrato => {
            const daysLeft = getDaysUntilExpiry(contrato.data_fim)
            const progress = getContractProgress(contrato.data_inicio, contrato.data_fim)
            const isExpiring = daysLeft !== null && daysLeft <= 30 && daysLeft >= 0
            const rmInfo = RM_STATUS_OPTIONS.find(r => r.value === contrato.rm_status)

            return (
              <Card key={contrato.id} className={cn(isExpiring && 'border-orange-200 bg-orange-50/30')}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-slate-800">
                          {contrato.cliente?.nome} — {contrato.cliente?.empresa}
                        </p>
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
          {filtered.length === 0 && <div className="text-center text-slate-400 py-12">Nenhum contrato encontrado.</div>}
        </div>
      )}
    </div>
  )
}
