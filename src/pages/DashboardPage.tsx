import { useLeads } from '@/hooks/useLeads'
import { useClientes } from '@/hooks/useClientes'
import { useContratos } from '@/hooks/useContratos'
import { useIndicacoes } from '@/hooks/useIndicacoes'
import { useOportunidades } from '@/hooks/useOportunidades'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PIPELINE_STAGES, LEAD_SOURCE_LABELS, CLIENT_STATUS_OPTIONS } from '@/lib/constants'
import { formatCurrency, getDaysUntilExpiry, formatDate } from '@/lib/utils'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Users, Briefcase, TrendingUp, FileText, AlertCircle, Share2, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316']

export function DashboardPage() {
  const { data: leads } = useLeads()
  const { data: clientes } = useClientes()
  const { data: contratos } = useContratos()
  const { data: indicacoes } = useIndicacoes()
  const { data: oportunidades } = useOportunidades()

  // KPIs
  const activeLeads = leads?.filter(l => l.status !== 'perdido' && l.status !== 'contrato_assinado').length || 0
  const activeClientes = clientes?.filter(c => c.status === 'ativo').length || 0
  const totalConversions = clientes?.length || 0
  const totalLeads = leads?.length || 0
  const convRate = totalLeads ? Math.round((totalConversions / totalLeads) * 100) : 0

  const mrrContratos = contratos?.filter(c => c.status === 'ativo' && c.valor_mensal) || []
  const mrr = mrrContratos.reduce((sum, c) => sum + (c.valor_mensal || 0), 0)

  const renewalsSoon = contratos?.filter(c => {
    const d = getDaysUntilExpiry(c.data_fim)
    return d !== null && d <= 60 && d >= 0 && c.status === 'ativo'
  }) || []

  const recompensasPendentes = indicacoes?.filter(i => i.status === 'convertido' && !i.recompensa_entregue).length || 0

  // Pipeline funnel data
  const funnelData = PIPELINE_STAGES.map(s => ({
    name: s.label.replace('Diagnóstico', 'Diag.'),
    value: leads?.filter(l => l.status === s.id).length || 0,
  }))

  // Lead sources
  const sourceData = Object.entries(
    leads?.reduce((acc, l) => { acc[l.origem] = (acc[l.origem] || 0) + 1; return acc }, {} as Record<string, number>) || {}
  ).map(([name, value]) => ({ name: LEAD_SOURCE_LABELS[name] || name, value }))

  // Contratos por status
  const contratoStatusData = [
    { name: 'Ativo', value: contratos?.filter(c => c.status === 'ativo').length || 0 },
    { name: 'Em Renovação', value: contratos?.filter(c => c.status === 'em_renovacao').length || 0 },
    { name: 'Encerrado', value: contratos?.filter(c => c.status === 'encerrado').length || 0 },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Leads Ativos', value: activeLeads, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Clientes Ativos', value: activeClientes, icon: Briefcase, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Taxa de Conversão', value: `${convRate}%`, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'MRR', value: formatCurrency(mrr), icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-500">{label}</p>
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', bg)}>
                  <Icon className={cn('w-4.5 h-4.5', color)} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card className={renewalsSoon.length > 0 ? 'border-orange-200' : ''}>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-1">
              {renewalsSoon.length > 0 && <AlertCircle className="w-4 h-4 text-orange-500" />}
              <p className="text-sm text-slate-500">Renovações em 60 dias</p>
            </div>
            <p className={cn('text-2xl font-bold', renewalsSoon.length > 0 ? 'text-orange-600' : 'text-slate-800')}>{renewalsSoon.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <Share2 className="w-4 h-4 text-indigo-500" />
              <p className="text-sm text-slate-500">Indicações totais</p>
            </div>
            <p className="text-2xl font-bold text-slate-800">{indicacoes?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className={recompensasPendentes > 0 ? 'border-amber-200' : ''}>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-1">
              {recompensasPendentes > 0 && <AlertCircle className="w-4 h-4 text-amber-500" />}
              <p className="text-sm text-slate-500">Recompensas pendentes</p>
            </div>
            <p className={cn('text-2xl font-bold', recompensasPendentes > 0 ? 'text-amber-600' : 'text-slate-800')}>{recompensasPendentes}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Funil de Pipeline</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={funnelData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Origens dos Leads</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                  {sourceData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Renewals alert */}
      {renewalsSoon.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              Contratos vencendo em 60 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {renewalsSoon.slice(0, 5).map(c => {
                const d = getDaysUntilExpiry(c.data_fim)
                return (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{c.cliente?.nome}</p>
                      <p className="text-xs text-slate-500">{c.cliente?.empresa} · Vence {formatDate(c.data_fim)}</p>
                    </div>
                    <span className={cn('text-xs font-medium', d !== null && d <= 15 ? 'text-red-600' : 'text-orange-600')}>
                      {d}d restantes
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
