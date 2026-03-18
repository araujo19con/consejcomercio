import { useMemo, useState } from 'react'
import { useLeads } from '@/hooks/useLeads'
import { useContratos } from '@/hooks/useContratos'
import { useIndicacoes } from '@/hooks/useIndicacoes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PIPELINE_STAGES, LEAD_SOURCE_LABELS, SEGMENTS } from '@/lib/constants'
import { formatCurrency, getDaysUntilExpiry } from '@/lib/utils'
import { differenceInDays } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { TrendingUp, Target, Clock, DollarSign, AlertCircle, Zap, Trophy, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

type Period = '30d' | '90d' | '6m' | 'all'
const PERIOD_LABELS: Record<Period, string> = { '30d': 'Últimos 30d', '90d': 'Últimos 90d', '6m': 'Últimos 6m', 'all': 'Tudo' }
const PERIOD_DAYS: Record<Period, number> = { '30d': 30, '90d': 90, '6m': 180, 'all': Infinity }

const COLORS = ['#0089ac', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316', '#06b6d4']
const STAGE_ORDER = PIPELINE_STAGES.map(s => s.id)

// ─── helpers ──────────────────────────────────────────────────────────────────

function pct(num: number, den: number) {
  if (!den) return 0
  return Math.round((num / den) * 100)
}

function StatCard({
  label, value, sub, icon: Icon, accent, alert,
}: {
  label: string; value: string | number; sub?: string
  icon: React.FC<{ className?: string }>; accent: string; alert?: boolean
}) {
  return (
    <Card className={alert ? 'border-red-200' : ''}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-slate-500">{label}</p>
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', accent)}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <p className={cn('text-2xl font-bold', alert ? 'text-red-600' : 'text-slate-800')}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AnalyticsPage() {
  const { data: leads = [] }      = useLeads()
  const { data: contratos = [] }  = useContratos()
  const { data: indicacoes = [] } = useIndicacoes()
  const [period, setPeriod] = useState<Period>('all')

  const metrics = useMemo(() => {
    // ── Period filter ──────────────────────────────────────────────────────
    const maxDays = PERIOD_DAYS[period]
    const filteredLeads = period === 'all'
      ? leads
      : leads.filter(l => differenceInDays(new Date(), new Date(l.created_at)) <= maxDays)

    // ── Funil ──────────────────────────────────────────────────────────────
    const funnelCounts = PIPELINE_STAGES.map(s => ({
      id: s.id,
      label: s.label,
      count: filteredLeads.filter(l => l.status === s.id).length,
    }))

    // ── Win / Loss ─────────────────────────────────────────────────────────
    const won  = filteredLeads.filter(l => l.status === 'contrato_assinado')
    const lost = filteredLeads.filter(l => l.status === 'perdido')
    const closed = won.length + lost.length
    const winRate = pct(won.length, closed)
    const lossRate = pct(lost.length, closed)

    // ── Tempo médio de fechamento ──────────────────────────────────────────
    const closeTimes = won
      .filter(l => l.created_at && l.updated_at)
      .map(l => differenceInDays(new Date(l.updated_at), new Date(l.created_at)))
    const avgCloseDays = closeTimes.length
      ? Math.round(closeTimes.reduce((a, b) => a + b, 0) / closeTimes.length)
      : null

    // ── Ticket médio ───────────────────────────────────────────────────────
    const contratoAtivos = contratos.filter(c => c.valor_total && c.status === 'ativo')
    const avgTicket = contratoAtivos.length
      ? contratoAtivos.reduce((s, c) => s + (c.valor_total ?? 0), 0) / contratoAtivos.length
      : null

    const mrr = contratos
      .filter(c => c.status === 'ativo' && c.valor_mensal)
      .reduce((s, c) => s + (c.valor_mensal ?? 0), 0)

    // ── Lead velocity (last 30 days vs prior 30 days) ─────────────────────
    const now = new Date()
    const leadsLast30 = leads.filter(l => differenceInDays(now, new Date(l.created_at)) <= 30).length
    const leadsPrior30 = leads.filter(l => {
      const d = differenceInDays(now, new Date(l.created_at))
      return d > 30 && d <= 60
    }).length
    const velocityDelta = leadsPrior30 ? pct(leadsLast30 - leadsPrior30, leadsPrior30) : null

    // ── Performance por fonte ─────────────────────────────────────────────
    const sourceMap: Record<string, { total: number; won: number }> = {}
    for (const l of filteredLeads) {
      if (!sourceMap[l.origem]) sourceMap[l.origem] = { total: 0, won: 0 }
      sourceMap[l.origem].total++
      if (l.status === 'contrato_assinado') sourceMap[l.origem].won++
    }
    const bySource = Object.entries(sourceMap)
      .map(([key, v]) => ({
        name: LEAD_SOURCE_LABELS[key] ?? key,
        total: v.total,
        won: v.won,
        taxa: pct(v.won, v.total + (filteredLeads.filter(l => l.origem === key && l.status === 'perdido').length)),
      }))
      .sort((a, b) => b.taxa - a.taxa)

    // ── Performance por segmento ──────────────────────────────────────────
    const segMap: Record<string, { total: number; won: number }> = {}
    for (const l of filteredLeads) {
      if (!segMap[l.segmento]) segMap[l.segmento] = { total: 0, won: 0 }
      segMap[l.segmento].total++
      if (l.status === 'contrato_assinado') segMap[l.segmento].won++
    }
    const bySegment = Object.entries(segMap)
      .map(([key, v]) => ({
        name: SEGMENTS.find(s => s.value === key)?.label ?? key,
        total: v.total,
        won: v.won,
        taxa: pct(v.won, v.total + (filteredLeads.filter(l => l.segmento === key && l.status === 'perdido').length)),
      }))
      .sort((a, b) => b.won - a.won)

    // ── Performance por responsável ───────────────────────────────────────
    const respMap: Record<string, { total: number; won: number }> = {}
    for (const l of filteredLeads) {
      const resp = l.responsavel ?? 'Sem responsável'
      if (!respMap[resp]) respMap[resp] = { total: 0, won: 0 }
      respMap[resp].total++
      if (l.status === 'contrato_assinado') respMap[resp].won++
    }
    const byResponsavel = Object.entries(respMap)
      .map(([name, v]) => ({ name, ...v, taxa: pct(v.won, v.total) }))
      .sort((a, b) => b.won - a.won)

    // ── Stagnant leads ────────────────────────────────────────────────────
    const STAGNANT: Record<string, number> = {
      novo_lead: 3, diagnostico_agendado: 5, diagnostico_realizado: 5, proposta_enviada: 7, em_negociacao: 10,
    }
    const stagnant = filteredLeads.filter(l => {
      if (l.status === 'perdido' || l.status === 'contrato_assinado') return false
      return differenceInDays(new Date(), new Date(l.updated_at)) >= (STAGNANT[l.status] ?? 7)
    })

    // ── Contratos vencendo ────────────────────────────────────────────────
    const expiring60 = contratos.filter(c => {
      const d = getDaysUntilExpiry(c.data_fim)
      return d !== null && d <= 60 && d >= 0 && c.status === 'ativo'
    })

    // ── Piedata Win/Loss ──────────────────────────────────────────────────
    const winLossPie = [
      { name: 'Ganhos', value: won.length },
      { name: 'Perdidos', value: lost.length },
      { name: 'Em andamento', value: filteredLeads.length - won.length - lost.length },
    ].filter(d => d.value > 0)

    return {
      funnelCounts, won, lost, closed, winRate, lossRate,
      avgCloseDays, avgTicket, mrr,
      leadsLast30, velocityDelta,
      bySource, bySegment, byResponsavel,
      stagnant, expiring60, winLossPie,
    }
  }, [leads, contratos, indicacoes, period])

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Analytics Comercial</h1>
          <p className="text-sm text-slate-500 mt-0.5">Métricas de conversão, tempo de funil e performance por canal</p>
        </div>
        {/* Period selector */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg shrink-0">
          {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                period === p ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Win Rate"
          value={`${metrics.winRate}%`}
          sub={`${metrics.won.length} fechados / ${metrics.closed} qualificados`}
          icon={Target}
          accent="bg-emerald-50 text-emerald-600"
          alert={metrics.closed > 5 && metrics.winRate < 30}
        />
        <StatCard
          label="Tempo médio de fechamento"
          value={metrics.avgCloseDays !== null ? `${metrics.avgCloseDays}d` : '—'}
          sub="Criação → Contrato assinado"
          icon={Clock}
          accent="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Ticket médio"
          value={metrics.avgTicket !== null ? formatCurrency(metrics.avgTicket) : '—'}
          sub="Contratos ativos com valor"
          icon={DollarSign}
          accent="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Leads (últimos 30d)"
          value={metrics.leadsLast30}
          sub={metrics.velocityDelta !== null
            ? `${metrics.velocityDelta >= 0 ? '+' : ''}${metrics.velocityDelta}% vs mês anterior`
            : undefined}
          icon={Zap}
          accent="bg-violet-50 text-violet-600"
          alert={metrics.velocityDelta !== null && metrics.velocityDelta < -20}
        />
      </div>

      {/* ── Risk KPIs ── */}
      {(metrics.stagnant.length > 0 || metrics.expiring60.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {metrics.stagnant.length > 0 && (
            <Card className="border-orange-200 bg-orange-50/30">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-orange-700">{metrics.stagnant.length} lead{metrics.stagnant.length > 1 ? 's' : ''} parado{metrics.stagnant.length > 1 ? 's' : ''}</p>
                  <p className="text-xs text-orange-600">Requerem follow-up imediato</p>
                </div>
              </CardContent>
            </Card>
          )}
          {metrics.expiring60.length > 0 && (
            <Card className="border-red-200 bg-red-50/30">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-700">{metrics.expiring60.length} contrato{metrics.expiring60.length > 1 ? 's' : ''} vencendo em 60d</p>
                  <p className="text-xs text-red-600">Inicie conversas de renovação agora</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Funil + Win/Loss ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">

        {/* Funnel bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Distribuição do Funil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.funnelCounts.map((stage, i) => {
                const max = Math.max(...metrics.funnelCounts.map(s => s.count), 1)
                const widthPct = Math.round((stage.count / max) * 100)
                const pctTotal = pct(stage.count, leads.length)
                const stageColors = [
                  'bg-slate-400', 'bg-violet-500', 'bg-blue-500',
                  'bg-amber-500', 'bg-orange-500', 'bg-emerald-500', 'bg-red-400',
                ]
                return (
                  <div key={stage.id} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-36 shrink-0 truncate">{stage.label}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-5 relative overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', stageColors[i])}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-slate-700 w-6 text-right">{stage.count}</span>
                    <span className="text-xs text-slate-400 w-8 text-right">{pctTotal}%</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Win/Loss Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Status do Portfólio</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={metrics.winLossPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="50%"
                  outerRadius={70}
                  innerRadius={42}
                >
                  {metrics.winLossPie.map((_, idx) => (
                    <Cell key={idx} fill={['#10b981', '#ef4444', '#94a3b8'][idx]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-1">
              {metrics.winLossPie.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ['#10b981', '#ef4444', '#94a3b8'][i] }} />
                  {d.name} ({d.value})
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Performance por Canal ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            Performance por Canal de Aquisição
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.bySource.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Nenhum lead com fonte definida.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 border-b border-slate-100">
                    <th className="text-left py-2 font-medium">Canal</th>
                    <th className="text-right py-2 font-medium">Total Leads</th>
                    <th className="text-right py-2 font-medium">Fechados</th>
                    <th className="text-right py-2 font-medium">Win Rate</th>
                    <th className="py-2 pl-4">Desempenho</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {metrics.bySource.map((row, i) => (
                    <tr key={row.name} className="hover:bg-slate-50">
                      <td className="py-2.5 font-medium text-slate-700 flex items-center gap-2">
                        {i === 0 && <Trophy className="w-3.5 h-3.5 text-amber-500" />}
                        {row.name}
                      </td>
                      <td className="py-2.5 text-right text-slate-600 tabular-nums">{row.total}</td>
                      <td className="py-2.5 text-right text-slate-600 tabular-nums">{row.won}</td>
                      <td className="py-2.5 text-right">
                        <span className={cn(
                          'font-bold tabular-nums',
                          row.taxa >= 50 ? 'text-emerald-600' : row.taxa >= 25 ? 'text-amber-600' : 'text-red-500'
                        )}>
                          {row.taxa}%
                        </span>
                      </td>
                      <td className="py-2.5 pl-4">
                        <div className="w-24 bg-slate-100 rounded-full h-1.5">
                          <div
                            className={cn('h-full rounded-full', row.taxa >= 50 ? 'bg-emerald-500' : row.taxa >= 25 ? 'bg-amber-500' : 'bg-red-400')}
                            style={{ width: `${row.taxa}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Performance por Segmento + Responsável ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* By segment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-500" />
              Performance por Segmento de Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={metrics.bySegment.slice(0, 7)} layout="vertical" margin={{ left: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                <Tooltip
                  formatter={(value, name) => [
                    name === 'won' ? `${value} fechados` : `${value} total`,
                    name === 'won' ? 'Ganhos' : 'Total'
                  ]}
                />
                <Bar dataKey="total" fill="#e2e8f0" radius={[0, 3, 3, 0]} />
                <Bar dataKey="won" fill="#0089ac" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* By responsavel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Ranking por Responsável
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.byResponsavel.filter(r => r.name !== 'Sem responsável').length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Nenhum lead com responsável atribuído.</p>
            ) : (
              <div className="space-y-3">
                {metrics.byResponsavel
                  .filter(r => r.name !== 'Sem responsável')
                  .slice(0, 6)
                  .map((r, i) => (
                    <div key={r.name} className="flex items-center gap-3">
                      <span className={cn(
                        'w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0',
                        i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                      )}>{i + 1}</span>
                      <span className="text-sm text-slate-700 flex-1 truncate">{r.name}</span>
                      <span className="text-xs text-slate-400">{r.won}/{r.total}</span>
                      <span className={cn(
                        'text-xs font-bold w-10 text-right',
                        r.taxa >= 50 ? 'text-emerald-600' : r.taxa >= 25 ? 'text-amber-600' : 'text-slate-400'
                      )}>{r.taxa}%</span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Insight box ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="col-span-3 bg-slate-900 rounded-2xl p-6 text-white">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">💡 Insights de Processo Comercial</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-xs text-slate-400 mb-1">O que o Win Rate diz</p>
              <p className="text-sm text-white leading-relaxed">
                {metrics.winRate >= 50
                  ? 'Excelente qualificação de leads. Mantenha os critérios atuais e foque em aumentar o volume.'
                  : metrics.winRate >= 25
                  ? 'Win rate aceitável. Revisar o pitch na etapa de proposta pode aumentar o fechamento.'
                  : 'Win rate abaixo do ideal. Revisar critérios de qualificação ou o processo de diagnóstico.'}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-xs text-slate-400 mb-1">Melhor canal de aquisição</p>
              <p className="text-sm text-white leading-relaxed">
                {metrics.bySource[0]
                  ? `"${metrics.bySource[0].name}" tem o maior win rate (${metrics.bySource[0].taxa}%). Invista mais esforço e indicações nesse canal.`
                  : 'Atribua origem aos leads para descobrir qual canal mais converte.'}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-xs text-slate-400 mb-1">Próxima alavanca</p>
              <p className="text-sm text-white leading-relaxed">
                {metrics.stagnant.length > 0
                  ? `${metrics.stagnant.length} leads parados. Um follow-up sistemático pode recuperar receita imediata sem novos leads.`
                  : metrics.expiring60.length > 0
                  ? `${metrics.expiring60.length} contratos vencem em 60 dias. Inicie conversas de renovação antes do prazo — não depois.`
                  : 'Pipeline saudável. Foque em aumentar o volume de novos leads e indicações.'}
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
