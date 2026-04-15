import { useState } from 'react'
import {
  usePosJuniors,
  useCreatePosJunior,
  useUpdatePosJunior,
  useDeletePosJunior,
} from '@/hooks/usePosJuniors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  GraduationCap,
  Plus,
  Search,
  Pencil,
  Trash2,
  Linkedin,
  Users,
  BookOpen,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PosJunior {
  id: string
  nome: string
  email?: string | null
  telefone?: string | null
  empresa?: string | null
  cargo?: string | null
  area_atuacao?: string | null
  anos_consej?: number | null
  semestre_saida?: string | null
  disponivel_mentoria: boolean
  linkedin?: string | null
  notas?: string | null
  created_at: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AREAS = [
  { value: 'trabalhista',  label: 'Trabalhista',        color: 'text-orange-400 bg-orange-500/10'   },
  { value: 'tributario',   label: 'Tributário',          color: 'text-amber-400 bg-amber-500/10'     },
  { value: 'civil',        label: 'Civil',               color: 'text-blue-400 bg-blue-500/10'       },
  { value: 'empresarial',  label: 'Empresarial',         color: 'text-violet-400 bg-violet-500/10'   },
  { value: 'imobiliario',  label: 'Imobiliário',         color: 'text-emerald-400 bg-emerald-500/10' },
  { value: 'pi',           label: 'Prop. Intelectual',   color: 'text-pink-400 bg-pink-500/10'       },
  { value: 'outro',        label: 'Outro',               color: 'text-slate-400 bg-slate-500/10'     },
]

const AREA_ALL = { value: '', label: 'Todas as áreas' }

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

function getAreaInfo(value?: string | null) {
  return AREAS.find(a => a.value === value) ?? null
}

// ─── Form state hook ──────────────────────────────────────────────────────────

interface FormState {
  nome: string
  email: string
  telefone: string
  empresa: string
  cargo: string
  area_atuacao: string
  anos_consej: string
  semestre_saida: string
  disponivel_mentoria: boolean
  linkedin: string
  notas: string
}

const EMPTY_FORM: FormState = {
  nome: '',
  email: '',
  telefone: '',
  empresa: '',
  cargo: '',
  area_atuacao: '',
  anos_consej: '',
  semestre_saida: '',
  disponivel_mentoria: false,
  linkedin: '',
  notas: '',
}

function formFromRecord(p: PosJunior): FormState {
  return {
    nome: p.nome,
    email: p.email ?? '',
    telefone: p.telefone ?? '',
    empresa: p.empresa ?? '',
    cargo: p.cargo ?? '',
    area_atuacao: p.area_atuacao ?? '',
    anos_consej: p.anos_consej != null ? String(p.anos_consej) : '',
    semestre_saida: p.semestre_saida ?? '',
    disponivel_mentoria: p.disponivel_mentoria,
    linkedin: p.linkedin ?? '',
    notas: p.notas ?? '',
  }
}

function formToPayload(f: FormState) {
  return {
    nome: f.nome.trim(),
    email: f.email.trim() || null,
    telefone: f.telefone.trim() || null,
    empresa: f.empresa.trim() || null,
    cargo: f.cargo.trim() || null,
    area_atuacao: f.area_atuacao || null,
    anos_consej: f.anos_consej !== '' ? Number(f.anos_consej) : null,
    semestre_saida: f.semestre_saida.trim() || null,
    disponivel_mentoria: f.disponivel_mentoria,
    linkedin: f.linkedin.trim() || null,
    notas: f.notas.trim() || null,
  }
}

// ─── Modal Form ───────────────────────────────────────────────────────────────

function PosJuniorForm({
  form,
  onChange,
}: {
  form: FormState
  onChange: (patch: Partial<FormState>) => void
}) {
  return (
    <div className="space-y-4 py-1">
      {/* Nome */}
      <div className="space-y-1.5">
        <Label>Nome *</Label>
        <Input
          value={form.nome}
          onChange={e => onChange({ nome: e.target.value })}
          placeholder="Nome completo"
        />
      </div>

      {/* Email + Telefone */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>E-mail</Label>
          <Input
            value={form.email}
            onChange={e => onChange({ email: e.target.value })}
            type="email"
            placeholder="nome@exemplo.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Telefone</Label>
          <Input
            value={form.telefone}
            onChange={e => onChange({ telefone: e.target.value })}
            placeholder="(11) 9 0000-0000"
          />
        </div>
      </div>

      {/* Empresa + Cargo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Empresa</Label>
          <Input
            value={form.empresa}
            onChange={e => onChange({ empresa: e.target.value })}
            placeholder="Empresa atual"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Cargo</Label>
          <Input
            value={form.cargo}
            onChange={e => onChange({ cargo: e.target.value })}
            placeholder="Advogado, Sócio…"
          />
        </div>
      </div>

      {/* Área + Anos CONSEJ */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Área de atuação</Label>
          <Select
            value={form.area_atuacao || '__none__'}
            onValueChange={v => onChange({ area_atuacao: v === '__none__' ? '' : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Nenhuma —</SelectItem>
              {AREAS.map(a => (
                <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Semestres na CONSEJ</Label>
          <Input
            value={form.anos_consej}
            onChange={e => onChange({ anos_consej: e.target.value })}
            type="number"
            min={0}
            placeholder="0"
          />
        </div>
      </div>

      {/* Semestre de saída + LinkedIn */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Semestre de saída</Label>
          <Input
            value={form.semestre_saida}
            onChange={e => onChange({ semestre_saida: e.target.value })}
            placeholder="ex: 2024.1"
          />
        </div>
        <div className="space-y-1.5">
          <Label>LinkedIn (URL)</Label>
          <Input
            value={form.linkedin}
            onChange={e => onChange({ linkedin: e.target.value })}
            placeholder="linkedin.com/in/…"
          />
        </div>
      </div>

      {/* Disponível para mentoria toggle */}
      <div
        className={cn(
          'flex items-center justify-between rounded-lg px-4 py-3 cursor-pointer select-none transition-colors',
          form.disponivel_mentoria
            ? 'bg-emerald-500/10 border border-emerald-500/20'
            : 'bg-[var(--alpha-bg-xs)] border border-[var(--alpha-border)]'
        )}
        onClick={() => onChange({ disponivel_mentoria: !form.disponivel_mentoria })}
      >
        <div className="flex items-center gap-2.5">
          {form.disponivel_mentoria ? (
            <span
              className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"
              style={{ boxShadow: '0 0 6px rgba(52,211,153,0.7)' }}
            />
          ) : (
            <span className="w-2 h-2 rounded-full bg-[rgba(100,120,140,0.40)] shrink-0" />
          )}
          <span
            className={cn(
              'text-sm font-medium',
              form.disponivel_mentoria
                ? 'text-emerald-400'
                : 'text-muted-foreground'
            )}
          >
            Disponível para mentoria
          </span>
        </div>
        {/* Toggle pill */}
        <div
          className={cn(
            'relative w-9 h-5 rounded-full transition-colors',
            form.disponivel_mentoria ? 'bg-emerald-500' : 'bg-[var(--alpha-border-md)]'
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
              form.disponivel_mentoria ? 'translate-x-4' : 'translate-x-0.5'
            )}
          />
        </div>
      </div>

      {/* Notas */}
      <div className="space-y-1.5">
        <Label>Observações</Label>
        <Textarea
          value={form.notas}
          onChange={e => onChange({ notas: e.target.value })}
          placeholder="Notas sobre este ex-membro…"
          rows={3}
        />
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div
      className="rounded-xl p-4 animate-pulse"
      style={{ background: 'var(--alpha-bg-xs)', border: '1px solid var(--alpha-border)' }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-[var(--alpha-border)] shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-[var(--alpha-border)] rounded w-36" />
          <div className="h-3 bg-[var(--alpha-bg-xs)] rounded w-52" />
        </div>
      </div>
      <div className="h-3 bg-[var(--alpha-bg-xs)] rounded w-24 mt-2" />
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string | number
}) {
  return (
    <div
      className="rounded-xl px-4 py-3 flex items-center gap-3"
      style={{ background: 'var(--alpha-bg-xs)', border: '1px solid var(--alpha-border)' }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'rgba(0,137,172,0.15)' }}
      >
        <Icon className="w-4 h-4 text-[#6bd0e7]" />
      </div>
      <div>
        <p className="text-lg font-bold text-foreground leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function PosJuniorsPage() {
  const { data: posJuniors, isLoading } = usePosJuniors()
  const createPosJunior = useCreatePosJunior()
  const updatePosJunior = useUpdatePosJunior()
  const deletePosJunior = useDeletePosJunior()

  const [search, setSearch] = useState('')
  const [areaFilter, setAreaFilter] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<PosJunior | null>(null)

  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM)
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM)

  // ── Stats ──
  const total = posJuniors?.length ?? 0
  const disponiveisCount = posJuniors?.filter(p => p.disponivel_mentoria).length ?? 0
  const pctDisponivel =
    total > 0 ? Math.round((disponiveisCount / total) * 100) : 0

  // ── Filtered list ──
  const filtered = (posJuniors ?? []).filter(p => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      p.nome.toLowerCase().includes(q) ||
      (p.empresa ?? '').toLowerCase().includes(q) ||
      (p.cargo ?? '').toLowerCase().includes(q)
    const matchArea = !areaFilter || p.area_atuacao === areaFilter
    return matchSearch && matchArea
  })

  // ── Handlers ──
  function handleCreate() {
    if (!createForm.nome.trim()) return
    createPosJunior.mutate(formToPayload(createForm), {
      onSuccess: () => {
        setShowCreate(false)
        setCreateForm(EMPTY_FORM)
      },
    })
  }

  function openEdit(p: PosJunior) {
    setEditTarget(p)
    setEditForm(formFromRecord(p))
  }

  function handleUpdate() {
    if (!editTarget || !editForm.nome.trim()) return
    updatePosJunior.mutate(
      { id: editTarget.id, ...formToPayload(editForm) },
      { onSuccess: () => setEditTarget(null) }
    )
  }

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    deletePosJunior.mutate(id)
    setDeleteConfirm(null)
  }

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Pós-Juniors</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Rede de ex-membros da CONSEJ
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreate(true)}
          className="shrink-0 text-white"
          style={{ backgroundColor: '#0089ac' }}
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Novo Pós-Junior
        </Button>
      </div>

      {/* ── Stats bar ── */}
      {!isLoading && total > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={Users} label="Ex-membros" value={total} />
          <StatCard icon={BookOpen} label="Disponíveis p/ mentoria" value={disponiveisCount} />
          <StatCard icon={TrendingUp} label="% disponível" value={`${pctDisponivel}%`} />
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-fg4" />
          <Input
            placeholder="Buscar por nome, empresa, cargo…"
            className="pl-8 h-9 text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1 bg-[var(--alpha-bg-xs)] p-1 rounded-lg flex-wrap">
          {[AREA_ALL, ...AREAS].map(a => {
            const isActive = areaFilter === a.value
            return (
              <button
                key={a.value}
                onClick={() => setAreaFilter(a.value)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  isActive
                    ? 'bg-white shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-fg2'
                )}
                style={isActive ? { backgroundColor: '#0089ac', color: '#fff' } : {}}
              >
                {a.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── List ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        /* Empty state */
        <div
          className="rounded-xl flex flex-col items-center justify-center py-16 gap-4"
          style={{ background: 'var(--alpha-bg-xs)', border: '1px solid var(--alpha-border)' }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(0,137,172,0.12)', border: '1px solid rgba(0,137,172,0.20)' }}
          >
            <GraduationCap className="w-7 h-7 text-[#6bd0e7]" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">
              {search || areaFilter
                ? 'Nenhum resultado encontrado'
                : 'Nenhum pós-junior cadastrado ainda'}
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              {search || areaFilter
                ? 'Tente outros termos ou limpe os filtros.'
                : 'Adicione o primeiro ex-membro e comece a construir a rede de alumni.'}
            </p>
          </div>
          {!search && !areaFilter && (
            <Button
              size="sm"
              onClick={() => setShowCreate(true)}
              className="text-white"
              style={{ backgroundColor: '#0089ac' }}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Novo Pós-Junior
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map(pj => {
            const areaInfo = getAreaInfo(pj.area_atuacao)
            const isConfirming = deleteConfirm === pj.id

            return (
              <div
                key={pj.id}
                className={cn(
                  'rounded-xl p-4 transition-all group relative',
                  isConfirming
                    ? 'border border-red-500/30'
                    : 'border border-[var(--alpha-border)] hover:border-[var(--alpha-bg-lg)]'
                )}
                style={{
                  background: isConfirming
                    ? 'rgba(239,68,68,0.05)'
                    : 'var(--alpha-bg-xs)',
                }}
              >
                {/* ── Card top row ── */}
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold select-none',
                      getAvatarClass(pj.nome)
                    )}
                  >
                    {getInitials(pj.nome)}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground truncate">
                        {pj.nome}
                      </p>
                      {/* Mentoria badge */}
                      {pj.disponivel_mentoria ? (
                        <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400">
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                            style={{ boxShadow: '0 0 5px rgba(52,211,153,0.8)' }}
                          />
                          Disponível p/ mentoria
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium bg-[var(--alpha-bg-sm)] text-muted-foreground">
                          <span className="w-1.5 h-1.5 rounded-full bg-[rgba(100,120,140,0.40)]" />
                          Não disponível
                        </span>
                      )}
                    </div>

                    {/* Empresa · Cargo */}
                    {(pj.empresa || pj.cargo) && (
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {[pj.cargo, pj.empresa].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>

                  {/* Action buttons — visible on hover */}
                  {!isConfirming && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => openEdit(pj)}
                        className="p-1.5 rounded-lg text-fg4 hover:bg-[var(--alpha-border)] hover:text-[rgba(200,215,230,0.80)] transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteConfirm(pj.id) }}
                        className="p-1.5 rounded-lg text-fg4 hover:bg-[rgba(239,68,68,0.12)] hover:text-[#f87171] transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Card bottom row ── */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {/* Area badge */}
                  {areaInfo && (
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        areaInfo.color
                      )}
                    >
                      {areaInfo.label}
                    </span>
                  )}

                  {/* Semestre de saída */}
                  {pj.semestre_saida && (
                    <span className="text-xs text-muted-foreground bg-[var(--alpha-bg-xs)] px-2 py-0.5 rounded-full">
                      Saída: {pj.semestre_saida}
                    </span>
                  )}

                  {/* Semestres na CONSEJ */}
                  {pj.anos_consej != null && (
                    <span className="text-xs text-muted-foreground bg-[var(--alpha-bg-xs)] px-2 py-0.5 rounded-full">
                      {pj.anos_consej} sem. na CONSEJ
                    </span>
                  )}

                  {/* LinkedIn */}
                  {pj.linkedin && (
                    <a
                      href={pj.linkedin.startsWith('http') ? pj.linkedin : `https://${pj.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="ml-auto p-1.5 rounded-lg text-[#6bd0e7] hover:bg-[rgba(0,137,172,0.15)] transition-colors"
                      title="Abrir LinkedIn"
                    >
                      <Linkedin className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {/* ── Inline delete confirm ── */}
                {isConfirming && (
                  <div
                    className="flex items-center justify-end gap-2 mt-3"
                    onClick={e => e.stopPropagation()}
                  >
                    <span className="text-xs text-red-400 font-medium mr-1">Excluir este pós-junior?</span>
                    <button
                      onClick={e => handleDelete(e, pj.id)}
                      className="text-xs px-2.5 py-1 rounded-md bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
                    >
                      Sim, excluir
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteConfirm(null) }}
                      className="text-xs px-2.5 py-1 rounded-md border border-[var(--alpha-bg-lg)] text-muted-foreground hover:bg-[var(--alpha-bg-xs)] transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Create Modal ── */}
      <Dialog open={showCreate} onOpenChange={o => { if (!o) { setShowCreate(false); setCreateForm(EMPTY_FORM) } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Pós-Junior</DialogTitle>
          </DialogHeader>
          <PosJuniorForm
            form={createForm}
            onChange={patch => setCreateForm(prev => ({ ...prev, ...patch }))}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowCreate(false); setCreateForm(EMPTY_FORM) }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!createForm.nome.trim() || createPosJunior.isPending}
              className="text-white"
              style={{ backgroundColor: '#0089ac' }}
            >
              {createPosJunior.isPending ? 'Salvando…' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Modal ── */}
      <Dialog open={!!editTarget} onOpenChange={o => { if (!o) setEditTarget(null) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Pós-Junior</DialogTitle>
          </DialogHeader>
          <PosJuniorForm
            form={editForm}
            onChange={patch => setEditForm(prev => ({ ...prev, ...patch }))}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!editForm.nome.trim() || updatePosJunior.isPending}
              className="text-white"
              style={{ backgroundColor: '#0089ac' }}
            >
              {updatePosJunior.isPending ? 'Salvando…' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
