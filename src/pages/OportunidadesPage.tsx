import { useOportunidades, useUpdateOportunidade } from '@/hooks/useOportunidades'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OPORTUNIDADE_STATUS, OPORTUNIDADE_TIPOS } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import { TrendingUp, RefreshCw, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const TIPO_ICONS = { upsell: ArrowUpRight, cross_sell: TrendingUp, renovacao: RefreshCw }
const TIPO_COLORS: Record<string, string> = {
  upsell: 'bg-purple-100 text-purple-700',
  cross_sell: 'bg-blue-100 text-blue-700',
  renovacao: 'bg-amber-100 text-amber-700',
}

export function OportunidadesPage() {
  const { data: oportunidades, isLoading } = useOportunidades()
  const updateOportunidade = useUpdateOportunidade()

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
                            <Select value={op.status} onValueChange={v => updateOportunidade.mutate({ id: op.id, status: v })}>
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
    </div>
  )
}
