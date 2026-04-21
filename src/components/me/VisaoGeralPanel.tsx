import { Users, Calendar, FileText, Trophy, Star, Target, Stethoscope, Award } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLeads } from '@/hooks/useLeads'
import { useReunioes } from '@/hooks/useReunioes'
import { useContratos } from '@/hooks/useContratos'
import { useMeusPontos, useTeamProgress } from '@/hooks/useGamification'
import { cn } from '@/lib/utils'

type Props = { userId: string }

function StatCard({ icon: Icon, label, value, iconBg, iconColor }: {
  icon: React.ElementType; label: string; value: number; iconBg: string; iconColor: string
}) {
  return (
    <div className="bg-card rounded-xl p-5 flex items-center gap-4 border">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: iconBg, color: iconColor }}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function MiniGoalBar({ label, value, meta, icon: Icon }: { label: string; value: number; meta: number; icon: React.ElementType }) {
  const pct = meta > 0 ? Math.min(100, (value / meta) * 100) : 0
  const color = pct >= 100 ? '#10b981' : pct >= 60 ? '#0089ac' : pct >= 30 ? '#f59e0b' : '#ef4444'
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 text-xs text-fg2">
          <Icon className="w-3.5 h-3.5" style={{ color }} />
          {label}
        </div>
        <span className="text-xs font-medium" style={{ color }}>{value} / {meta}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export function VisaoGeralPanel({ userId }: Props) {
  const navigate = useNavigate()
  const { data: leads = [] } = useLeads()
  const { data: reunioes = [] } = useReunioes()
  const { data: contratos = [] } = useContratos()
  const meusPontos = useMeusPontos()
  const teamProgress = useTeamProgress()

  const meusLeads = leads.filter(l => l.responsavel_id === userId).length
  const minhasReunioes = reunioes.filter(r => r.responsavel_id === userId && r.status === 'realizada').length
  const meusContratos = contratos.filter(c => c.responsavel_id === userId).length

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Award className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold text-fg2">Meus feitos</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <StatCard icon={Users}    label="Leads captados"       value={meusLeads}       iconBg="rgba(59,130,246,0.15)" iconColor="#93c5fd" />
          <StatCard icon={Calendar} label="Reuniões realizadas"  value={minhasReunioes}  iconBg="rgba(16,185,129,0.15)" iconColor="#6ee7b7" />
          <StatCard icon={FileText} label="Contratos fechados"   value={meusContratos}   iconBg="rgba(139,92,246,0.15)" iconColor="#a78bfa" />
        </div>
      </div>

      {/* Performance */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold text-fg2">Minha performance</h2>
          {meusPontos && (
            <button
              onClick={() => navigate('/ranking')}
              className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium transition-opacity hover:opacity-80"
              style={{ background: 'rgba(0,137,172,0.15)', color: '#6bd0e7', border: '1px solid rgba(0,137,172,0.3)' }}
              title="Ver ranking completo da equipe"
            >
              #{meusPontos.rank} no ranking →
            </button>
          )}
        </div>

        {meusPontos ? (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-card rounded-xl border p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,137,172,0.15)', color: '#6bd0e7' }}>
                <Star className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{meusPontos.pontos_mes}</p>
                <p className="text-xs text-muted-foreground">pontos este mês</p>
              </div>
            </div>
            <div className="bg-card rounded-xl border p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{meusPontos.pontos}</p>
                <p className="text-xs text-muted-foreground">pontos totais</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-xl border p-4 mb-4 text-sm text-muted-foreground">
            Nenhuma atividade registrada ainda.
          </div>
        )}

        <div className="bg-card rounded-xl border p-4 mb-4 space-y-3">
          <p className="text-xs font-semibold text-fg4 uppercase tracking-wider mb-2">Metas do time este mês</p>
          <MiniGoalBar label="Deals fechados"      value={teamProgress.leads_fechados_mes} meta={teamProgress.metas.meta_leads_mes}        icon={Target}     />
          <MiniGoalBar label="Diagnósticos"        value={teamProgress.diagnosticos_mes}   meta={teamProgress.metas.meta_diagnosticos_mes} icon={Stethoscope}/>
          <MiniGoalBar label="Reuniões realizadas" value={teamProgress.reunioes_mes}       meta={teamProgress.metas.meta_reunioes_mes}     icon={Calendar}   />
        </div>

        {meusPontos && meusPontos.badges.length > 0 && (
          <div className="bg-card rounded-xl border p-4 mb-4">
            <p className="text-xs font-semibold text-fg4 uppercase tracking-wider mb-3">Conquistas desbloqueadas</p>
            <div className="flex flex-wrap gap-2">
              {meusPontos.badges.map(b => (
                <div
                  key={b.id}
                  title={b.description}
                  className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', 'border cursor-default')}
                  style={{ background: 'rgba(0,137,172,0.10)', border: '1px solid rgba(0,137,172,0.25)', color: '#6bd0e7' }}
                >
                  <span>{b.emoji}</span>
                  {b.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {meusPontos && (
          <div className="bg-card rounded-xl border p-4">
            <p className="text-xs font-semibold text-fg4 uppercase tracking-wider mb-3">Minha atividade em leads</p>
            <div className="grid grid-cols-4 gap-3 text-center">
              {[
                { label: 'Prospectados', value: meusPontos.leads_prospectados, color: '#6bd0e7' },
                { label: 'Fechados',     value: meusPontos.leads_fechados,     color: '#10b981' },
                { label: 'Diagnósticos', value: meusPontos.diagnosticos,       color: '#a78bfa' },
                { label: 'Reuniões',     value: meusPontos.reunioes,           color: '#f59e0b' },
              ].map(item => (
                <div key={item.label} className="rounded-lg p-3" style={{ background: 'var(--alpha-bg-xs)' }}>
                  <p className="text-xl font-bold" style={{ color: item.color }}>{item.value}</p>
                  <p className="text-xs text-fg4 mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
