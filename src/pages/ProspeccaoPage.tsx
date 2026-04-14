import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLeads } from '@/hooks/useLeads'
import { LEAD_SOURCES, SEGMENTS, PIPELINE_STAGES, BUDGET_OPTIONS } from '@/lib/constants'
import { SearchInput } from '@/components/ui/search-input'
import { Phone, Mail, Copy, Check, ExternalLink, X, Target, Users, PhoneCall } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Lead } from '@/types'

// ─── Qualification scoring ────────────────────────────────────────────────────

const ACTIVE_STAGES = [
  'classificacao', 'levantamento_oportunidade', 'educar_lead',
  'proposta_comercial', 'negociacao', 'stand_by',
]

function calcScore(lead: Lead): number {
  let s = 0
  if (lead.telefone) s += 20
  if (lead.email)    s += 15
  if (lead.diagnostico) s += 20
  if (lead.servicos_interesse?.length) s += 10
  switch (lead.investimento_estimado) {
    case 'acima_10k': s += 20; break
    case '5k_10k':   s += 15; break
    case '2k_5k':    s += 10; break
    case '500_2k':   s += 5;  break
  }
  if (lead.status === 'negociacao')       s += 12
  if (lead.status === 'proposta_comercial') s += 8
  const daysOld = (Date.now() - new Date(lead.created_at).getTime()) / 86_400_000
  if (daysOld < 30) s += 8
  else if (daysOld < 60) s += 4
  return Math.min(s, 100)
}

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 70 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
    score >= 40 ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                  'bg-muted text-muted-foreground border'
  const label = score >= 70 ? 'Alta' : score >= 40 ? 'Média' : 'Baixa'
  return (
    <div className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-semibold', cls)}>
      <span className="tabular-nums w-5 text-center">{score}</span>
      <span className="opacity-70">{label}</span>
    </div>
  )
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyBtn({ value, icon: Icon }: { value: string; icon: React.FC<{ className?: string }> }) {
  const [copied, setCopied] = useState(false)
  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group"
      title={`Copiar: ${value}`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      <span className="max-w-[140px] truncate">{value}</span>
      {copied
        ? <Check className="w-3 h-3 text-emerald-400 ml-0.5" />
        : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-60 ml-0.5 transition-opacity" />
      }
    </button>
  )
}

// ─── Lead card row ────────────────────────────────────────────────────────────

function LeadRow({ lead, score }: { lead: Lead; score: number }) {
  const navigate = useNavigate()
  const stage = PIPELINE_STAGES.find(s => s.id === lead.status)
  const origem = LEAD_SOURCES.find(o => o.value === lead.origem)

  const STAGE_PILL: Record<string, string> = {
    classificacao:             'bg-sky-500/10 text-sky-400 border-sky-500/20',
    levantamento_oportunidade: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    educar_lead:               'bg-violet-500/10 text-violet-400 border-violet-500/20',
    proposta_comercial:        'bg-amber-500/10 text-amber-400 border-amber-500/20',
    negociacao:                'bg-orange-500/10 text-orange-400 border-orange-500/20',
    stand_by:                  'bg-muted text-muted-foreground border',
  }

  return (
    <div
      className="bg-card border rounded-xl px-4 py-3.5 hover:border-primary/30 transition-colors cursor-pointer"
      onClick={() => navigate(`/leads/${lead.id}`)}
    >
      <div className="flex items-center gap-4">

        {/* Score */}
        <div className="shrink-0 hidden sm:block">
          <ScoreBadge score={score} />
        </div>

        {/* Empresa + Representante */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{lead.empresa}</p>
          <p className="text-sm text-muted-foreground truncate">{lead.nome}</p>
        </div>

        {/* Contato */}
        <div className="shrink-0 hidden md:flex flex-col gap-1 min-w-0 w-44">
          {lead.telefone
            ? <CopyBtn value={lead.telefone} icon={Phone} />
            : <span className="text-xs text-fg4">Sem telefone</span>
          }
          {lead.email
            ? <CopyBtn value={lead.email} icon={Mail} />
            : <span className="text-xs text-fg4">Sem e-mail</span>
          }
        </div>

        {/* Estágio */}
        <div className="shrink-0 hidden lg:block">
          <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', STAGE_PILL[lead.status] ?? 'bg-muted text-muted-foreground border')}>
            {stage?.label ?? lead.status}
          </span>
        </div>

        {/* Origem */}
        <div className="shrink-0 hidden xl:block w-28">
          <p className="text-xs text-muted-foreground truncate">{origem?.label ?? lead.origem?.replace(/_/g, ' ')}</p>
        </div>

        {/* Ação */}
        <button
          onClick={e => { e.stopPropagation(); navigate(`/leads/${lead.id}`) }}
          className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Ver lead"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Mobile contato */}
      <div className="flex gap-4 mt-2 md:hidden">
        {lead.telefone && <CopyBtn value={lead.telefone} icon={Phone} />}
        {lead.email && <CopyBtn value={lead.email} icon={Mail} />}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: 'score', label: 'Prioridade' },
  { value: 'recente', label: 'Mais recente' },
  { value: 'empresa', label: 'Empresa A-Z' },
]

export function ProspeccaoPage() {
  const { data: leads = [], isLoading } = useLeads()
  const [search, setSearch]         = useState('')
  const [segmento, setSegmento]     = useState('todos')
  const [estagio, setEstagio]       = useState('todos')
  const [origem, setOrigem]         = useState('todos')
  const [investimento, setInvestimento] = useState('todos')
  const [apenasComContato, setApenasComContato] = useState(false)
  const [sort, setSort]             = useState('score')

  // Scored + filtered leads
  const { qualified, scored } = useMemo(() => {
    // Only active pipeline stages
    const active = leads.filter(l => ACTIVE_STAGES.includes(l.status))
    const scored = active.map(l => ({ lead: l, score: calcScore(l) }))

    const filtered = scored.filter(({ lead }) => {
      const q = search.toLowerCase()
      if (search && !lead.nome.toLowerCase().includes(q) && !lead.empresa.toLowerCase().includes(q)) return false
      if (segmento !== 'todos' && lead.segmento !== segmento) return false
      if (estagio !== 'todos' && lead.status !== estagio) return false
      if (origem !== 'todos' && lead.origem !== origem) return false
      if (investimento !== 'todos' && lead.investimento_estimado !== investimento) return false
      if (apenasComContato && !lead.telefone && !lead.email) return false
      return true
    })

    const sorted = [...filtered].sort((a, b) => {
      if (sort === 'score')   return b.score - a.score
      if (sort === 'empresa') return a.lead.empresa.localeCompare(b.lead.empresa)
      return new Date(b.lead.created_at).getTime() - new Date(a.lead.created_at).getTime()
    })

    return { qualified: sorted, scored }
  }, [leads, search, segmento, estagio, origem, investimento, apenasComContato, sort])

  const stats = useMemo(() => ({
    total: scored.length,
    comContato: scored.filter(({ lead }) => lead.telefone || lead.email).length,
    alta: scored.filter(({ score }) => score >= 70).length,
  }), [scored])

  const hasFilter = search || segmento !== 'todos' || estagio !== 'todos' || origem !== 'todos' || investimento !== 'todos' || apenasComContato

  const selectCls = 'h-8 px-2.5 text-xs rounded-lg border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40'

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando leads...</div>

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Lista de Prospecção
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Leads ativos no pipeline, ordenados por prioridade de abordagem
          </p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Users,     label: 'Leads ativos',    value: stats.total,       color: 'text-primary' },
          { icon: PhoneCall, label: 'Com contato',      value: stats.comContato,  color: 'text-emerald-400' },
          { icon: Target,    label: 'Alta prioridade',  value: stats.alta,        color: 'text-amber-400' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-card border rounded-xl px-4 py-3 flex items-center gap-3">
            <Icon className={cn('w-5 h-5 shrink-0', color)} />
            <div>
              <p className="text-xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar empresa ou representante…" className="w-52" />

        <select value={segmento} onChange={e => setSegmento(e.target.value)} className={selectCls}>
          <option value="todos">Todos os segmentos</option>
          {SEGMENTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <select value={estagio} onChange={e => setEstagio(e.target.value)} className={selectCls}>
          <option value="todos">Todos os estágios</option>
          {ACTIVE_STAGES.map(id => {
            const stage = PIPELINE_STAGES.find(s => s.id === id)
            return <option key={id} value={id}>{stage?.label ?? id}</option>
          })}
        </select>

        <select value={origem} onChange={e => setOrigem(e.target.value)} className={selectCls}>
          <option value="todos">Todas as origens</option>
          {LEAD_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <select value={investimento} onChange={e => setInvestimento(e.target.value)} className={selectCls}>
          <option value="todos">Qualquer investimento</option>
          {BUDGET_OPTIONS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
        </select>

        {/* Apenas com contato toggle */}
        <button
          onClick={() => setApenasComContato(v => !v)}
          className={cn(
            'h-8 px-2.5 flex items-center gap-1.5 text-xs rounded-lg border transition-colors',
            apenasComContato
              ? 'bg-primary/15 border-primary/40 text-primary font-medium'
              : 'bg-card text-muted-foreground hover:text-foreground'
          )}
        >
          <Phone className="w-3 h-3" />
          Só com contato
        </button>

        {/* Sort */}
        <select value={sort} onChange={e => setSort(e.target.value)} className={cn(selectCls, 'ml-auto')}>
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>Ordenar: {o.label}</option>)}
        </select>

        {/* Clear */}
        {hasFilter && (
          <button
            onClick={() => { setSearch(''); setSegmento('todos'); setEstagio('todos'); setOrigem('todos'); setInvestimento('todos'); setApenasComContato(false) }}
            className="h-8 px-2.5 flex items-center gap-1 text-xs rounded-lg border text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3 h-3" /> Limpar
          </button>
        )}
      </div>

      {/* Column headers */}
      <div className="hidden md:grid px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
        style={{ gridTemplateColumns: '80px 1fr 180px 160px 120px 32px' }}>
        <span>Score</span>
        <span>Empresa / Representante</span>
        <span>Contato</span>
        <span>Estágio</span>
        <span className="hidden lg:block">Origem</span>
        <span />
      </div>

      {/* Result count */}
      {hasFilter && (
        <p className="text-xs text-muted-foreground">
          Exibindo <span className="font-semibold text-foreground">{qualified.length}</span> de {stats.total} leads ativos
        </p>
      )}

      {/* List */}
      <div className="space-y-1.5">
        {qualified.map(({ lead, score }) => (
          <LeadRow key={lead.id} lead={lead} score={score} />
        ))}
        {qualified.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum lead encontrado com esses filtros.</p>
          </div>
        )}
      </div>
    </div>
  )
}
