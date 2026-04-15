import { useState } from 'react'
import { Trophy, Target, Stethoscope, CalendarDays, DollarSign, Star, Gift, Medal } from 'lucide-react'
import { useRanking, useTeamProgress } from '@/hooks/useGamification'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { RankingEntry } from '@/hooks/useGamification'

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ perfil, size = 'md' }: { perfil: RankingEntry['perfil']; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'w-16 h-16 text-xl' : size === 'md' ? 'w-10 h-10 text-sm' : 'w-7 h-7 text-xs'
  const initials = perfil.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  return perfil.foto_url ? (
    <img src={perfil.foto_url} alt={perfil.nome} className={cn(sz, 'rounded-full object-cover shrink-0')} />
  ) : (
    <div className={cn(sz, 'rounded-full flex items-center justify-center text-white font-bold shrink-0 bg-[#006d88]')}>
      {initials}
    </div>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function GoalBar({ label, current, target, icon: Icon, format }: {
  label: string; current: number; target: number
  icon: React.FC<{ className?: string }>; format?: (v: number) => string
}) {
  const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0
  const fmt = format ?? ((v: number) => String(v))
  const color = pct >= 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-[#0089ac]' : pct >= 30 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="w-3.5 h-3.5 shrink-0" />
          {label}
        </div>
        <span className="text-xs font-semibold text-fg2 tabular-nums">
          {fmt(current)} / {fmt(target)}
          <span className={cn('ml-1.5 font-bold', pct >= 100 ? 'text-emerald-400' : 'text-fg4')}>{pct}%</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── Podium ───────────────────────────────────────────────────────────────────

function Podium({ top3 }: { top3: RankingEntry[] }) {
  const [first, second, third] = [top3[0], top3[1], top3[2]]
  const podiumOrder = [second, first, third].filter(Boolean)
  const heights = second ? ['h-20', 'h-28', 'h-14'] : ['h-20', 'h-28', 'h-14']
  const medals = ['🥈', '🥇', '🥉']
  const cols = ['order-1', 'order-2', 'order-3']

  return (
    <div className="flex items-end justify-center gap-4 py-6">
      {podiumOrder.map((entry, i) => {
        const isFirst = entry.rank === 1
        return (
          <div key={entry.perfil.id} className={cn('flex flex-col items-center gap-2', cols[i])}>
            {/* Badge líder do mês */}
            {entry.badges.find(b => b.id === 'lider_mes') && (
              <span className="text-lg animate-bounce">🏆</span>
            )}
            {/* Avatar */}
            <div className={cn('relative', isFirst && 'scale-110')}>
              <Avatar perfil={entry.perfil} size={isFirst ? 'lg' : 'md'} />
            </div>
            {/* Name + pontos */}
            <div className="text-center">
              <p className={cn('font-semibold truncate max-w-[90px]', isFirst ? 'text-sm text-foreground' : 'text-xs text-fg2')}>
                {entry.perfil.nome.split(' ')[0]}
              </p>
              <p className={cn('font-bold tabular-nums', isFirst ? 'text-[#6bd0e7] text-lg' : 'text-fg4 text-sm')}>
                {entry.pontos_mes} pts
              </p>
            </div>
            {/* Podium block */}
            <div
              className={cn('w-24 rounded-t-xl flex items-center justify-center text-2xl', heights[i])}
              style={{
                background: isFirst
                  ? 'linear-gradient(180deg,rgba(0,137,172,0.35) 0%,rgba(0,137,172,0.12) 100%)'
                  : 'var(--alpha-bg-xs)',
                border: '1px solid',
                borderColor: isFirst ? 'rgba(0,137,172,0.40)' : 'var(--alpha-bg-md)',
              }}
            >
              {medals[i]}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ViewMode = 'mes' | 'total'

export function RankingPage() {
  const ranking = useRanking()
  const progress = useTeamProgress()
  const [view, setView] = useState<ViewMode>('mes')

  const sorted = [...ranking].sort((a, b) =>
    view === 'mes'
      ? (b.pontos_mes - a.pontos_mes || b.pontos - a.pontos)
      : (b.pontos - a.pontos)
  )
  const top3 = sorted.slice(0, 3)

  const colClass = 'text-xs text-fg4 text-right tabular-nums'

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            Ranking Comercial
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Pontuação por ações e resultados no pipeline</p>
        </div>
        {/* Toggle */}
        <div className="flex items-center gap-1 bg-[var(--alpha-bg-xs)] p-1 rounded-lg shrink-0">
          {(['mes', 'total'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                view === v ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-fg2'
              )}
            >
              {v === 'mes' ? 'Este mês' : 'Total'}
            </button>
          ))}
        </div>
      </div>

      {ranking.length === 0 ? (
        <div className="text-center py-20 text-fg4">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Nenhum membro com perfil cadastrado ainda.</p>
          <p className="text-xs mt-1">Cada usuário deve criar seu perfil em <strong>/perfil</strong>.</p>
        </div>
      ) : (
        <>
          {/* Podium */}
          {top3.length > 0 && (
            <div className="bg-card border rounded-2xl overflow-hidden">
              <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-fg4">
                  {view === 'mes' ? 'Pódio do Mês' : 'Pódio All-time'}
                </p>
                {view === 'mes' && top3[0]?.pontos_mes === 0 && (
                  <p className="text-xs text-fg4 italic">Sem atividade registrada ainda este mês</p>
                )}
              </div>
              <Podium top3={top3} />
            </div>
          )}

          {/* Metas do time este mês */}
          <div className="bg-card border rounded-2xl p-5 space-y-4">
            <p className="text-sm font-semibold text-fg2 flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> Metas do Time — {new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
            <GoalBar
              label="Deals fechados"
              current={progress.leads_fechados_mes}
              target={progress.metas.meta_leads_mes}
              icon={Trophy}
            />
            <GoalBar
              label="MRR ativo"
              current={Math.round(progress.mrr_mes)}
              target={progress.metas.meta_mrr_mes}
              icon={DollarSign}
              format={v => formatCurrency(v)}
            />
            <GoalBar
              label="Diagnósticos aplicados"
              current={progress.diagnosticos_mes}
              target={progress.metas.meta_diagnosticos_mes}
              icon={Stethoscope}
            />
            <GoalBar
              label="Reuniões realizadas"
              current={progress.reunioes_mes}
              target={progress.metas.meta_reunioes_mes}
              icon={CalendarDays}
            />
          </div>

          {/* Full ranking table */}
          <div className="bg-card border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b">
              <p className="text-sm font-semibold text-fg2 flex items-center gap-2">
                <Medal className="w-4 h-4 text-amber-400" /> Ranking Completo
              </p>
            </div>
            {/* Column headers */}
            <div
              className="grid px-5 py-2 text-[10px] font-semibold uppercase tracking-widest text-fg4 border-b"
              style={{ gridTemplateColumns: '28px 1fr 60px 60px 60px 60px 70px' }}
            >
              <span>#</span>
              <span>Membro</span>
              <span className="text-right">Prosp.</span>
              <span className="text-right">Fechou</span>
              <span className="text-right">Diag.</span>
              <span className="text-right">Reun.</span>
              <span className="text-right">Pontos {view === 'mes' ? '(mês)' : '(total)'}</span>
            </div>
            <div className="divide-y divide-[var(--alpha-bg-xs)]">
              {sorted.map((entry, i) => {
                const pts = view === 'mes' ? entry.pontos_mes : entry.pontos
                const isTop = i === 0 && pts > 0
                return (
                  <div
                    key={entry.perfil.id}
                    className={cn(
                      'grid items-center px-5 py-3 transition-colors hover:bg-[var(--alpha-bg-xs)]',
                      isTop && 'bg-[rgba(0,137,172,0.06)]'
                    )}
                    style={{ gridTemplateColumns: '28px 1fr 60px 60px 60px 60px 70px' }}
                  >
                    {/* Rank */}
                    <span className={cn('text-xs font-bold', i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-700' : 'text-fg4')}>
                      {i + 1}
                    </span>
                    {/* Member */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar perfil={entry.perfil} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{entry.perfil.nome}</p>
                        <div className="flex items-center gap-1 flex-wrap">
                          {entry.badges.slice(0, 3).map(b => (
                            <span key={b.id} title={b.description} className="text-xs cursor-default">{b.emoji}</span>
                          ))}
                          {entry.perfil.cargo && (
                            <span className="text-[10px] text-fg4 truncate">{entry.perfil.cargo}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={colClass}>{entry.leads_prospectados}</span>
                    <span className={colClass}>{entry.leads_fechados}</span>
                    <span className={colClass}>{entry.diagnosticos}</span>
                    <span className={colClass}>{entry.reunioes}</span>
                    <span className={cn('text-right font-bold tabular-nums text-sm', isTop ? 'text-[#6bd0e7]' : 'text-fg2')}>
                      {pts}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Badges gallery */}
          <div className="bg-card border rounded-2xl p-5">
            <p className="text-sm font-semibold text-fg2 flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-violet-400" /> Conquistas
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { id: 'lider_mes',           emoji: '🏆', label: 'Líder do Mês',       description: 'Maior pontuação do mês' },
                { id: 'primeiro_fechamento', emoji: '🎯', label: 'Primeiro Fechamento', description: 'Primeiro deal ganho' },
                { id: 'em_chamas',           emoji: '🔥', label: 'Em Chamas',           description: '3+ deals num mês' },
                { id: 'alto_valor',          emoji: '💎', label: 'Alto Valor',          description: 'Contrato > R$ 5.000' },
                { id: 'rede_forte',          emoji: '🤝', label: 'Rede Forte',          description: '5+ leads de indicação' },
                { id: 'diagnostico_ativo',   emoji: '🩺', label: 'Diagnóstico Ativo',  description: '10+ diagnósticos' },
              ].map(b => {
                const holders = ranking.filter(e => e.badges.find(eb => eb.id === b.id))
                return (
                  <div
                    key={b.id}
                    className={cn(
                      'rounded-xl p-3 border transition-colors',
                      holders.length > 0
                        ? 'border-[rgba(0,137,172,0.30)] bg-[rgba(0,137,172,0.06)]'
                        : 'border-[var(--alpha-bg-sm)] opacity-40'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{b.emoji}</span>
                      <span className="text-xs font-semibold text-fg2">{b.label}</span>
                    </div>
                    <p className="text-[10px] text-fg4 mb-2">{b.description}</p>
                    {holders.length > 0 ? (
                      <div className="flex items-center gap-1 flex-wrap">
                        {holders.map(h => (
                          <span key={h.perfil.id} className="text-[10px] text-primary font-medium">
                            {h.perfil.nome.split(' ')[0]}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-fg4 italic">Ninguém ainda</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recompensa do mês */}
          {progress.metas.recompensa_descricao && (
            <div
              className="rounded-2xl px-5 py-4 flex items-start gap-3"
              style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)' }}
            >
              <Gift className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'rgba(196,181,253,0.85)' }} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(196,181,253,0.60)' }}>
                  Recompensa do Mês
                </p>
                <p className="text-sm" style={{ color: 'rgba(196,181,253,0.85)' }}>
                  {progress.metas.recompensa_descricao}
                </p>
              </div>
            </div>
          )}

          {/* Points legend */}
          <div className="bg-card border rounded-2xl p-5">
            <p className="text-xs font-semibold text-fg4 uppercase tracking-widest mb-3">Como os pontos são calculados</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
              {[
                { label: 'Lead prospectado',         pts: progress.metas.pontos_lead_criado,      icon: '👤' },
                { label: 'Proposta comercial',        pts: progress.metas.pontos_proposta,         icon: '📄' },
                { label: 'Negociação iniciada',       pts: progress.metas.pontos_negociacao,       icon: '🤝' },
                { label: 'Diagnóstico aplicado',      pts: progress.metas.pontos_diagnostico,      icon: '🩺' },
                { label: 'Reunião realizada',         pts: progress.metas.pontos_reuniao,          icon: '📅' },
                { label: 'Lead de indicação',         pts: progress.metas.pontos_indicacao,        icon: '🔗' },
                { label: 'Deal ganho — Assessoria',   pts: progress.metas.pontos_ganho_assessoria, icon: '🏆' },
                { label: 'Deal ganho — Consultoria',  pts: progress.metas.pontos_ganho_consultoria,icon: '🎯' },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between text-muted-foreground">
                  <span>{r.icon} {r.label}</span>
                  <span className="font-semibold text-fg2 tabular-nums">+{r.pts}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
