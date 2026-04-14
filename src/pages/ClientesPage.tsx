import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClientes, useDeleteCliente } from '@/hooks/useClientes'
import { useIndicacoes } from '@/hooks/useIndicacoes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { CLIENT_STATUS_OPTIONS, SEGMENTS } from '@/lib/constants'
import { getDaysUntilExpiry } from '@/lib/utils'
import { Search, Briefcase, AlertCircle, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Cliente, Contrato } from '@/types'
import { NewClienteModal } from '@/components/clientes/NewClienteModal'

// ─── Health Score ──────────────────────────────────────────────────────────────

type HealthLevel = 'green' | 'yellow' | 'red' | 'gray'

const HEALTH_STYLES: Record<HealthLevel, { dot: string; label: string }> = {
  green:  { dot: 'bg-emerald-500', label: 'text-emerald-400' },
  yellow: { dot: 'bg-amber-400',   label: 'text-amber-400'   },
  red:    { dot: 'bg-red-500',     label: 'text-red-400'     },
  gray:   { dot: 'bg-slate-500',   label: 'text-[rgba(100,120,140,0.55)]' },
}

// ─── Nível de Pertencimento ───────────────────────────────────────────────────

type NivelPertencimento = 1 | 2 | 3 | 4 | 5
const NIVEL_LABELS: Record<NivelPertencimento, { label: string; color: string }> = {
  1: { label: 'Curioso',           color: 'text-slate-400'   },
  2: { label: 'Interessado',       color: 'text-sky-400'     },
  3: { label: 'Parceiro Ativo',    color: 'text-blue-400'    },
  4: { label: 'Defensor',          color: 'text-violet-400'  },
  5: { label: 'Construtor',        color: 'text-amber-400'   },
}

function getNivelPertencimento(cliente: Cliente, referralsCount: number): NivelPertencimento {
  const contratos = cliente.contratos || []
  const hasActive = contratos.some(c => c.status === 'ativo')
  const hasAny    = contratos.length > 0
  if (!hasAny) return 1
  if (!hasActive) return 2
  if (referralsCount === 0) return 3
  // level 5: active 12+ months + referrals + NPS ≥ 9
  const oldest = contratos.filter(c => c.data_inicio).sort((a, b) => new Date(a.data_inicio!).getTime() - new Date(b.data_inicio!).getTime())[0]
  const monthsActive = oldest ? Math.floor((Date.now() - new Date(oldest.data_inicio!).getTime()) / (1000 * 60 * 60 * 24 * 30)) : 0
  if (monthsActive >= 12 && referralsCount >= 1 && (cliente.nps_score ?? 0) >= 9) return 5
  return 4
}

function getClientHealth(cliente: Cliente): { level: HealthLevel; text: string } {
  const active = cliente.contratos?.filter(c => c.status === 'ativo') || []
  if (active.length === 0) return { level: 'gray', text: 'Sem contrato ativo' }

  const assessoria = active.filter(c => c.tipo === 'assessoria')
  if (assessoria.length === 0) return { level: 'yellow', text: 'Só consultoria' }

  const minDays = Math.min(...assessoria.map(c => getDaysUntilExpiry(c.data_fim) ?? 999))
  if (minDays < 0)   return { level: 'red',    text: 'Contrato vencido' }
  if (minDays <= 30) return { level: 'red',    text: `${minDays}d restantes` }
  if (minDays <= 90) return { level: 'yellow', text: `${minDays}d restantes` }
  return { level: 'green', text: 'Assessoria ativa' }
}

// ─── Avatar helpers ────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  'bg-[rgba(99,102,241,0.20)] text-[#a5b4fc]',
  'bg-[rgba(16,185,129,0.20)] text-[#6ee7b7]',
  'bg-[rgba(139,92,246,0.20)] text-[#c4b5fd]',
  'bg-[rgba(245,158,11,0.15)] text-[#fbbf24]',
  'bg-[rgba(6,182,212,0.20)] text-[#67e8f9]',
  'bg-[rgba(244,63,94,0.20)] text-[#fda4af]',
  'bg-[rgba(59,130,246,0.20)] text-[#93c5fd]',
  'bg-[rgba(249,115,22,0.20)] text-[#fdba74]',
]

function getAvatarClass(name: string) {
  const sum = Array.from(name).reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length]
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatusColor(status: string) {
  return CLIENT_STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-[rgba(255,255,255,0.04)] text-[rgba(150,165,180,0.70)]'
}

function getSegmentLabel(value: string) {
  return SEGMENTS.find(s => s.value === value)?.label || value
}

function getNextExpiry(contratos: Contrato[] | undefined): string | null {
  if (!contratos?.length) return null
  const active = contratos.filter(c => c.status === 'ativo' && c.data_fim)
  if (!active.length) return null
  return active.sort((a, b) => new Date(a.data_fim!).getTime() - new Date(b.data_fim!).getTime())[0].data_fim!
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ClienteCardSkeleton() {
  return (
    <div className="bg-card rounded-xl p-4 animate-pulse" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.07)] shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-[rgba(255,255,255,0.07)] rounded w-36" />
          <div className="h-3 bg-[rgba(255,255,255,0.04)] rounded w-52" />
        </div>
        <div className="space-y-1.5 text-right">
          <div className="h-3 bg-[rgba(255,255,255,0.04)] rounded w-20 ml-auto" />
          <div className="h-3 bg-[rgba(255,255,255,0.04)] rounded w-16 ml-auto" />
        </div>
      </div>
    </div>
  )
}

// ─── Status filter tabs ────────────────────────────────────────────────────────

const STATUS_TABS = [
  { value: 'todos',        label: 'Todos' },
  { value: 'ativo',        label: 'Ativos' },
  { value: 'em_renovacao', label: 'Em Renovação' },
  { value: 'encerrado',   label: 'Encerrados' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ClientesPage() {
  const navigate   = useNavigate()
  const { data: clientes, isLoading } = useClientes()
  const { data: indicacoes = [] }     = useIndicacoes()
  const deleteCliente = useDeleteCliente()

  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [showNew, setShowNew]           = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const filtered = clientes?.filter(c => {
    const matchSearch = !search || c.nome.toLowerCase().includes(search.toLowerCase()) || c.empresa.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'todos' || c.status === statusFilter
    return matchSearch && matchStatus
  }) || []

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    deleteCliente.mutate(id)
    setDeleteConfirm(null)
  }

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[rgba(230,235,240,0.92)]">Clientes</h1>
          <p className="text-sm text-[rgba(130,150,170,0.65)] mt-0.5">Gerencie sua carteira de clientes ativos e histórico de contratos</p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowNew(true)}
          className="shrink-0 text-white"
          style={{ backgroundColor: '#0089ac' }}
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Novo Cliente
        </Button>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-[rgba(100,120,140,0.55)]" />
          <Input
            placeholder="Buscar por nome ou empresa…"
            className="pl-8 h-9 text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Pill tabs — brand-consistent */}
        <div className="flex items-center gap-1 bg-[rgba(255,255,255,0.04)] p-1 rounded-lg">
          {STATUS_TABS.map(tab => {
            const count = tab.value === 'todos'
              ? (clientes?.length ?? 0)
              : (clientes?.filter(c => c.status === tab.value).length ?? 0)
            const isActive = statusFilter === tab.value
            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5',
                  isActive ? 'bg-white text-[rgba(230,235,240,0.92)] shadow-sm' : 'text-[rgba(130,150,170,0.65)] hover:text-[rgba(215,225,235,0.85)]'
                )}
              >
                {tab.label}
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-semibold tabular-nums',
                  isActive ? 'text-white' : 'bg-[rgba(255,255,255,0.07)] text-[rgba(130,150,170,0.65)]'
                )} style={isActive ? { backgroundColor: '#0089ac' } : {}}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── List ── */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <ClienteCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={search ? 'Nenhum resultado encontrado' : 'Nenhum cliente cadastrado ainda'}
          description={
            search
              ? `Não encontramos clientes para "${search}". Tente outros termos ou limpe a busca.`
              : 'Adicione seu primeiro cliente e comece a gerenciar contratos e oportunidades.'
          }
          action={!search ? { label: '+ Novo Cliente', onClick: () => setShowNew(true) } : undefined}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(cliente => {
            const nextExpiry     = getNextExpiry(cliente.contratos)
            const daysLeft       = nextExpiry ? getDaysUntilExpiry(nextExpiry) : null
            const isExpiringSoon = daysLeft !== null && daysLeft <= 60 && daysLeft >= 0
            const isConfirming   = deleteConfirm === cliente.id
            const health         = getClientHealth(cliente)
            const hs             = HEALTH_STYLES[health.level]
            const refCount       = indicacoes.filter(i => i.indicante_cliente_id === cliente.id).length
            const nivel          = getNivelPertencimento(cliente, refCount)
            const nivelInfo      = NIVEL_LABELS[nivel]

            return (
              <div
                key={cliente.id}
                className="bg-card rounded-xl p-4 cursor-pointer transition-all group"
                style={isConfirming
                  ? { border: '1px solid rgba(239,68,68,0.30)', background: 'rgba(239,68,68,0.05)' }
                  : { border: '1px solid rgba(255,255,255,0.07)' }}
                onClick={() => { if (!isConfirming) navigate(`/clientes/${cliente.id}`) }}
              >
                <div className="flex items-center gap-4">

                  {/* Initials avatar */}
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold select-none',
                    getAvatarClass(cliente.nome)
                  )}>
                    {getInitials(cliente.nome)}
                  </div>

                  {/* Name + company */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-[rgba(230,235,240,0.92)]">{cliente.nome}</p>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', getStatusColor(cliente.status))}>
                        {CLIENT_STATUS_OPTIONS.find(s => s.value === cliente.status)?.label}
                      </span>
                    </div>
                    <p className="text-sm text-[rgba(130,150,170,0.65)] truncate">
                      {cliente.empresa} · {getSegmentLabel(cliente.segmento)}
                    </p>
                  </div>

                  {/* Right side */}
                  {!isConfirming ? (
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Health Score indicator */}
                      <div className="flex items-center gap-1.5" title={health.text}>
                        <span className={cn('w-2 h-2 rounded-full shrink-0 animate-pulse', hs.dot, health.level !== 'green' && 'animate-none')} style={health.level === 'green' ? { animation: 'none' } : {}} />
                        <span className={cn('text-xs font-medium hidden sm:block', hs.label)}>{health.text}</span>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-2 mb-0.5">
                          <span className={cn('text-[10px] font-medium', nivelInfo.color)}>Nv.{nivel} {nivelInfo.label}</span>
                          {cliente.nps_score !== null && cliente.nps_score !== undefined && (
                            <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', cliente.nps_score >= 9 ? 'bg-emerald-500/15 text-emerald-400' : cliente.nps_score >= 7 ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400')}>
                              NPS {cliente.nps_score}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[rgba(130,150,170,0.65)]">
                          {cliente.contratos?.length || 0} contrato{(cliente.contratos?.length || 0) !== 1 ? 's' : ''}
                        </p>
                        {nextExpiry && (
                          <div className={cn(
                            'flex items-center justify-end gap-1 text-xs mt-0.5',
                            isExpiringSoon ? 'text-orange-600 font-medium' : 'text-[rgba(100,120,140,0.55)]'
                          )}>
                            {isExpiringSoon && <AlertCircle className="w-3 h-3" />}
                            {daysLeft === 0
                              ? 'Vence hoje'
                              : daysLeft && daysLeft < 0
                              ? 'Vencido'
                              : `Vence em ${daysLeft}d`}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteConfirm(cliente.id) }}
                        className="p-1.5 rounded-lg text-[rgba(80,100,120,0.50)] hover:bg-[rgba(239,68,68,0.12)] hover:text-[#f87171] transition-colors opacity-0 group-hover:opacity-100"
                        title="Excluir cliente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    /* Inline delete confirmation — no native confirm() */
                    <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      <span className="text-xs text-red-600 font-medium">Excluir?</span>
                      <button
                        onClick={e => handleDelete(e, cliente.id)}
                        className="text-xs px-2.5 py-1 rounded-md bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
                      >
                        Sim
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteConfirm(null) }}
                        className="text-xs px-2.5 py-1 rounded-md border border-slate-300 text-[rgba(150,165,180,0.70)] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <NewClienteModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={(id) => navigate(`/clientes/${id}`)}
      />
    </div>
  )
}
