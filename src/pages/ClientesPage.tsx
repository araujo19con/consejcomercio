import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClientes, useDeleteCliente } from '@/hooks/useClientes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { CLIENT_STATUS_OPTIONS, SEGMENTS } from '@/lib/constants'
import { getDaysUntilExpiry } from '@/lib/utils'
import { Search, Briefcase, AlertCircle, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Contrato } from '@/types'
import { NewClienteModal } from '@/components/clientes/NewClienteModal'

// ─── Avatar helpers ────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-cyan-100 text-cyan-700',
  'bg-rose-100 text-rose-700',
  'bg-blue-100 text-blue-700',
  'bg-orange-100 text-orange-700',
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
  return CLIENT_STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-slate-100 text-slate-600'
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
    <div className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-200 rounded w-36" />
          <div className="h-3 bg-slate-100 rounded w-52" />
        </div>
        <div className="space-y-1.5 text-right">
          <div className="h-3 bg-slate-100 rounded w-20 ml-auto" />
          <div className="h-3 bg-slate-100 rounded w-16 ml-auto" />
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
          <h1 className="text-xl font-bold text-slate-800">Clientes</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gerencie sua carteira de clientes ativos e histórico de contratos</p>
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
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nome ou empresa…"
            className="pl-8 h-9 text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Pill tabs — brand-consistent */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
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
                  isActive ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {tab.label}
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-semibold tabular-nums',
                  isActive ? 'text-white' : 'bg-slate-200 text-slate-500'
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

            return (
              <div
                key={cliente.id}
                className={cn(
                  'bg-white border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md group',
                  isConfirming ? 'border-red-200 bg-red-50' : 'border-slate-200 hover:border-slate-300'
                )}
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
                      <p className="font-semibold text-slate-800">{cliente.nome}</p>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', getStatusColor(cliente.status))}>
                        {CLIENT_STATUS_OPTIONS.find(s => s.value === cliente.status)?.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 truncate">
                      {cliente.empresa} · {getSegmentLabel(cliente.segmento)}
                    </p>
                  </div>

                  {/* Right side */}
                  {!isConfirming ? (
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-slate-500">
                          {cliente.contratos?.length || 0} contrato{(cliente.contratos?.length || 0) !== 1 ? 's' : ''}
                        </p>
                        {nextExpiry && (
                          <div className={cn(
                            'flex items-center justify-end gap-1 text-xs mt-0.5',
                            isExpiringSoon ? 'text-orange-600 font-medium' : 'text-slate-400'
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
                        className="p-1.5 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
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
                        className="text-xs px-2.5 py-1 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors"
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
