import { useLeads } from '@/hooks/useLeads'
import { useClientes } from '@/hooks/useClientes'
import { useContratos } from '@/hooks/useContratos'
import { useIndicacoes } from '@/hooks/useIndicacoes'
import { useOportunidades } from '@/hooks/useOportunidades'
import { useReunioesSemanais } from '@/hooks/useReunioes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PIPELINE_STAGES, LEAD_SOURCE_LABELS, STAGE_COLORS } from '@/lib/constants'
import { formatCurrency, getDaysUntilExpiry, formatDate } from '@/lib/utils'
import { differenceInDays } from 'date-fns'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, Briefcase, TrendingUp, FileText, AlertCircle, Share2, DollarSign, Calendar, Clock, Video, MapPin, Flame, Bell, ArrowRight, Gift } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316']

const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

export function DashboardPage() {
  const navigate = useNavigate()
  const { data: leads } = useLeads()
  const { data: clientes } = useClientes()
  const { data: contratos } = useContratos()
  const { data: indicacoes } = useIndicacoes()
  const { data: oportunidades } = useOportunidades()
  const { data: reunioesSemana = [] } = useReunioesSemanais()

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

  // Stagnant leads (no status change in 7+ days, still active)
  const STAGNANT_THRESHOLDS: Record<string, number> = {
    novo_lead: 3, diagnostico_agendado: 5, diagnostico_realizado: 5, proposta_enviada: 7, em_negociacao: 10,
  }
  const stagnantLeads = leads?.filter(l => {
    if (l.status === 'perdido' || l.status === 'contrato_assinado') return false
    const days = differenceInDays(new Date(), new Date(l.updated_at))
    return days >= (STAGNANT_THRESHOLDS[l.status] ?? 7)
  }).sort((a, b) => differenceInDays(new Date(), new Date(b.updated_at)) - differenceInDays(new Date(), new Date(a.updated_at))) || []

  const renewalsUrgent = contratos?.filter(c => {
    const d = getDaysUntilExpiry(c.data_fim)
    return d !== null && d <= 15 && d >= 0 && c.status === 'ativo'
  }) || []

  const hasActionItems = stagnantLeads.length > 0 || renewalsUrgent.length > 0 || recompensasPendentes > 0

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

      {/* ── Para hoje ── */}
      {hasActionItems && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4">
          <h2 className="text-sm font-semibold text-orange-800 flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4" /> Para hoje
          </h2>
          <div className="flex flex-wrap gap-2">
            {stagnantLeads.length > 0 && (
              <button
                onClick={() => navigate('/leads')}
                className="flex items-center gap-2 bg-white border border-orange-200 rounded-lg px-3 py-2 text-sm hover:bg-orange-50 transition-colors shadow-sm"
              >
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span className="font-medium text-slate-700">{stagnantLeads.length} lead{stagnantLeads.length > 1 ? 's' : ''} parado{stagnantLeads.length > 1 ? 's' : ''}</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
              </button>
            )}
            {renewalsUrgent.length > 0 && (
              <button
                onClick={() => navigate('/contratos')}
                className="flex items-center gap-2 bg-white border border-red-200 rounded-lg px-3 py-2 text-sm hover:bg-red-50 transition-colors shadow-sm"
              >
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                <span className="font-medium text-slate-700">{renewalsUrgent.length} contrato{renewalsUrgent.length > 1 ? 's' : ''} vence{renewalsUrgent.length > 1 ? 'm' : ''} em 15d</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
              </button>
            )}
            {recompensasPendentes > 0 && (
              <button
                onClick={() => navigate('/indicacoes')}
                className="flex items-center gap-2 bg-white border border-amber-200 rounded-lg px-3 py-2 text-sm hover:bg-amber-50 transition-colors shadow-sm"
              >
                <Gift className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-medium text-slate-700">{recompensasPendentes} recompensa{recompensasPendentes > 1 ? 's' : ''} pendente{recompensasPendentes > 1 ? 's' : ''}</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
              </button>
            )}
          </div>
        </div>
      )}

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

      {/* Reuniões da semana — destaque */}
      <Card className="border-2" style={{ borderColor: '#0089ac' }}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" style={{ color: '#0089ac' }} />
              Reuniões desta semana
            </CardTitle>
            <button
              onClick={() => navigate('/reunioes')}
              className="text-xs px-3 py-1 rounded-lg text-white font-medium"
              style={{ backgroundColor: '#0089ac' }}
            >
              Ver todas
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {reunioesSemana.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Nenhuma reunião esta semana.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {reunioesSemana.map(r => {
                const dt = new Date(r.data_hora)
                const statusColors = { agendada: '#0089ac', realizada: '#10b981', cancelada: '#ef4444' }
                return (
                  <div key={r.id} className="rounded-xl border p-3 space-y-1.5" style={{ borderLeftWidth: 3, borderLeftColor: statusColors[r.status] }}>
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-sm font-semibold text-slate-800 leading-tight">{r.titulo}</p>
                      <span className="text-xs shrink-0 font-medium" style={{ color: statusColors[r.status] }}>
                        {DIAS_SEMANA[dt.getDay()]}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      {dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às {dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {r.local && <div className="flex items-center gap-1 text-xs text-slate-400"><MapPin className="w-3 h-3" />{r.local}</div>}
                    {r.link_video && (
                      <a href={r.link_video} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-white px-2 py-1 rounded-md w-fit" style={{ backgroundColor: '#0089ac' }}>
                        <Video className="w-3 h-3" />Entrar
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Stagnant leads alert */}
      {stagnantLeads.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              Leads parados ({stagnantLeads.length})
              <span className="text-xs font-normal text-slate-400 ml-1">— precisam de atenção</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stagnantLeads.slice(0, 6).map(l => {
                const days = differenceInDays(new Date(), new Date(l.updated_at))
                const stageLabel = PIPELINE_STAGES.find(s => s.id === l.status)?.label ?? l.status
                const stageCss = STAGE_COLORS[l.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'
                return (
                  <div
                    key={l.id}
                    className="flex items-center justify-between py-2 border-b last:border-0 cursor-pointer hover:bg-slate-50 rounded px-1 -mx-1 transition-colors"
                    onClick={() => navigate(`/leads/${l.id}`)}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{l.nome}</p>
                      <p className="text-xs text-slate-500 truncate">{l.empresa}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border', stageCss)}>
                        {stageLabel}
                      </span>
                      <span className="text-xs font-semibold text-orange-600 flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />{days}d
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            {stagnantLeads.length > 6 && (
              <button onClick={() => navigate('/leads')} className="mt-3 text-xs text-slate-400 hover:text-slate-600 underline w-full text-center">
                Ver todos os {stagnantLeads.length} leads parados →
              </button>
            )}
          </CardContent>
        </Card>
      )}

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
