import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2, Circle, ExternalLink, Plus, Trash2, Calendar, AlertTriangle,
  MessageCircle, Users, Briefcase, FileText, Handshake, Target, Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import {
  useMinhasTarefas, useCreateTarefa, useConcluirTarefa, useDeleteTarefa,
} from '@/hooks/useTarefas'
import { useLeads } from '@/hooks/useLeads'
import { useContratos } from '@/hooks/useContratos'
import { useOportunidades } from '@/hooks/useOportunidades'
import { useInteracoes } from '@/hooks/useInteracoes'
import { useReunioes } from '@/hooks/useReunioes'
import { deriveTarefas, isVencida, type TarefaDerivada } from '@/lib/tarefas-derivadas'
import type { Tarefa, TarefaPrioridade, TarefaTipo } from '@/types'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'

type Props = { userId: string }

const TIPO_ICONS: Record<string, typeof Target> = {
  generica:     Target,
  followup:     MessageCircle,
  reuniao_prep: Calendar,
  renovacao:    FileText,
  upsell:       Briefcase,
  diagnostico:  Users,
  proposta:     Handshake,
  cobranca:     Send,
}

const PRIORIDADE_LABEL: Record<TarefaPrioridade, string> = {
  critica: 'Crítica',
  alta:    'Alta',
  media:   'Média',
  baixa:   'Baixa',
}

const PRIORIDADE_STYLE: Record<TarefaPrioridade, { bg: string; color: string; border: string }> = {
  critica: { bg: 'rgba(239,68,68,0.12)',  color: '#fca5a5', border: 'rgba(239,68,68,0.30)'  },
  alta:    { bg: 'rgba(249,115,22,0.12)', color: '#fdba74', border: 'rgba(249,115,22,0.30)' },
  media:   { bg: 'rgba(0,137,172,0.12)',  color: '#6bd0e7', border: 'rgba(0,137,172,0.30)'  },
  baixa:   { bg: 'var(--alpha-bg-sm)',    color: 'var(--text-soft-a)', border: 'var(--alpha-border)' },
}

// União entre persistida e derivada, com marcador.
type TarefaUnificada =
  | (Tarefa & { derivada?: false; link?: string; acao?: { label: string; rota: string } })
  | TarefaDerivada

export function TarefasPanel({ userId }: Props) {
  const navigate = useNavigate()
  const { data: minhasTarefas = [] } = useMinhasTarefas(userId)
  const { data: leads = [] } = useLeads()
  const { data: contratos = [] } = useContratos()
  const { data: oportunidades = [] } = useOportunidades()
  const { data: interacoes = [] } = useInteracoes()
  const { data: reunioes = [] } = useReunioes()

  const concluir = useConcluirTarefa()
  const remover = useDeleteTarefa()
  const criar = useCreateTarefa()

  const [newOpen, setNewOpen] = useState(false)
  const [filtroPrio, setFiltroPrio] = useState<'all' | TarefaPrioridade>('all')
  const [filtroTipo, setFiltroTipo] = useState<'all' | TarefaTipo | 'derivada'>('all')

  const derivadas = useMemo(
    () => deriveTarefas({ meuId: userId, leads, contratos, oportunidades, interacoes, reunioes }),
    [userId, leads, contratos, oportunidades, interacoes, reunioes],
  )

  const unificadas: TarefaUnificada[] = useMemo(() => {
    // tarefas persistidas têm prioridade na ordenação: primeiro as abertas,
    // depois as derivadas. Vencidas/críticas sobem dentro de cada grupo.
    const PRI = { critica: 0, alta: 1, media: 2, baixa: 3 }
    const persistidas = [...minhasTarefas].sort((a, b) => {
      const pa = PRI[a.prioridade] ?? 99
      const pb = PRI[b.prioridade] ?? 99
      if (pa !== pb) return pa - pb
      const da = a.data_vencimento ? new Date(a.data_vencimento).getTime() : Infinity
      const db = b.data_vencimento ? new Date(b.data_vencimento).getTime() : Infinity
      return da - db
    })
    return [...persistidas, ...derivadas]
  }, [minhasTarefas, derivadas])

  const filtradas = useMemo(() => unificadas.filter(t => {
    if (filtroPrio !== 'all' && t.prioridade !== filtroPrio) return false
    if (filtroTipo === 'derivada') return (t as TarefaDerivada).derivada === true
    if (filtroTipo !== 'all' && t.tipo !== filtroTipo) return false
    return true
  }), [unificadas, filtroPrio, filtroTipo])

  const vencidas = unificadas.filter(t => isVencida(t.data_vencimento) && t.prioridade === 'critica').length

  return (
    <div className="space-y-4">
      {/* Header + filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">Minhas tarefas</h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--alpha-bg-sm)', color: 'var(--text-soft-a)' }}>
            {unificadas.length}
          </span>
          {vencidas > 0 && (
            <span
              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}
              title="Tarefas críticas vencidas"
            >
              <AlertTriangle className="w-3 h-3" />
              {vencidas} vencida(s)
            </span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Select value={filtroPrio} onValueChange={v => setFiltroPrio(v as typeof filtroPrio)}>
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas prioridades</SelectItem>
              <SelectItem value="critica">Crítica</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroTipo} onValueChange={v => setFiltroTipo(v as typeof filtroTipo)}>
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tipos</SelectItem>
              <SelectItem value="derivada">Automáticas</SelectItem>
              <SelectItem value="generica">Genéricas</SelectItem>
              <SelectItem value="followup">Follow-up</SelectItem>
              <SelectItem value="renovacao">Renovação</SelectItem>
              <SelectItem value="reuniao_prep">Reunião</SelectItem>
              <SelectItem value="upsell">Upsell</SelectItem>
              <SelectItem value="diagnostico">Diagnóstico</SelectItem>
              <SelectItem value="proposta">Proposta</SelectItem>
              <SelectItem value="cobranca">Cobrança</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setNewOpen(true)} style={{ backgroundColor: '#0089ac' }} className="h-8 gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Nova tarefa
          </Button>
        </div>
      </div>

      {filtradas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3" style={{ background: 'rgba(16,185,129,0.15)' }}>
              <CheckCircle2 className="w-5 h-5" style={{ color: '#6ee7b7' }} />
            </div>
            <p className="text-sm font-medium text-foreground">Tudo em dia</p>
            <p className="text-xs text-muted-foreground mt-1">Nenhuma tarefa pendente com esses filtros.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y" style={{ borderColor: 'var(--alpha-border)' }}>
              {filtradas.map(t => {
                const derivada = (t as TarefaDerivada).derivada === true
                const Icon = TIPO_ICONS[t.tipo] ?? Target
                const vencida = isVencida(t.data_vencimento)
                const prioStyle = PRIORIDADE_STYLE[t.prioridade]
                const link = (t as TarefaDerivada).link ?? (t.entidade_tipo ? entityLink(t.entidade_tipo, t.entidade_id ?? '') : null)
                const acao = (t as TarefaDerivada).acao

                return (
                  <div
                    key={t.id}
                    className={cn('px-4 py-3 flex items-start gap-3 hover:bg-[var(--alpha-bg-xs)] transition-colors group')}
                  >
                    <button
                      type="button"
                      title={derivada ? 'Esta é uma tarefa automática — resolva a origem ou conclua-a como tarefa manual' : 'Concluir'}
                      onClick={() => {
                        if (derivada) return
                        concluir.mutate((t as Tarefa).id)
                      }}
                      disabled={derivada}
                      className="mt-0.5 shrink-0 text-muted-foreground hover:text-[#10b981] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Circle className="w-4 h-4" />
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium text-fg2 truncate">{t.titulo}</span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium border"
                          style={{ background: prioStyle.bg, color: prioStyle.color, borderColor: prioStyle.border }}
                        >
                          {PRIORIDADE_LABEL[t.prioridade]}
                        </span>
                        {derivada && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd' }}>
                            automática
                          </span>
                        )}
                      </div>
                      {(t.descricao || (t as TarefaDerivada).descricao) && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {t.descricao ?? (t as TarefaDerivada).descricao}
                        </p>
                      )}
                      {t.data_vencimento && (
                        <p className={cn('text-[11px] mt-1 inline-flex items-center gap-1', vencida ? 'text-[#fca5a5]' : 'text-fg4')}>
                          <Calendar className="w-3 h-3" />
                          {vencida ? 'Venceu ' : 'Vence '}
                          {formatDate(t.data_vencimento)}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-1">
                      {acao && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(acao.rota)}
                          className="h-7 gap-1 text-xs"
                        >
                          {acao.label}
                        </Button>
                      )}
                      {link && (
                        <button
                          type="button"
                          onClick={() => navigate(link)}
                          title="Abrir"
                          className="p-1.5 rounded hover:bg-[var(--alpha-bg-sm)] text-muted-foreground hover:text-fg2 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {!derivada && (
                        <button
                          type="button"
                          onClick={() => remover.mutate((t as Tarefa).id)}
                          title="Remover"
                          className="p-1.5 rounded hover:bg-[rgba(239,68,68,0.10)] text-muted-foreground hover:text-[#fca5a5] transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <NovaTarefaModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreate={(input) => criar.mutateAsync(input).then(() => setNewOpen(false))}
        userId={userId}
      />
    </div>
  )
}

function entityLink(tipo: string, id: string): string | null {
  if (tipo === 'lead')         return `/leads/${id}`
  if (tipo === 'cliente')      return `/clientes/${id}`
  if (tipo === 'contrato')     return '/contratos'
  if (tipo === 'oportunidade') return '/oportunidades'
  if (tipo === 'reuniao')      return '/reunioes'
  if (tipo === 'indicacao')    return '/indicacoes'
  return null
}

// ─── Modal nova tarefa manual ──────────────────────────────────────────────

type NewProps = {
  open: boolean
  onClose: () => void
  onCreate: (input: Omit<Tarefa, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  userId: string
}

function NovaTarefaModal({ open, onClose, onCreate, userId }: NewProps) {
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tipo, setTipo] = useState<TarefaTipo>('generica')
  const [prioridade, setPrioridade] = useState<TarefaPrioridade>('media')
  const [dataVencimento, setDataVencimento] = useState('')
  const [busy, setBusy] = useState(false)

  function reset() {
    setTitulo(''); setDescricao(''); setTipo('generica'); setPrioridade('media'); setDataVencimento('')
  }

  async function handleCreate() {
    if (!titulo.trim()) return
    setBusy(true)
    try {
      await onCreate({
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        tipo,
        prioridade,
        status: 'aberta',
        data_vencimento: dataVencimento ? new Date(dataVencimento).toISOString() : null,
        data_conclusao: null,
        notas: null,
        atribuido_a_id: userId,
        criado_por_id: userId,
        entidade_tipo: null,
        entidade_id: null,
      })
      reset()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && !busy && (onClose(), reset())}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nova tarefa</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs font-medium text-fg2 mb-1 block">Título *</label>
            <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="O que precisa ser feito?" autoFocus />
          </div>
          <div>
            <label className="text-xs font-medium text-fg2 mb-1 block">Descrição</label>
            <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3} placeholder="Contexto, links, anotações..." />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-fg2 mb-1 block">Tipo</label>
              <Select value={tipo} onValueChange={v => setTipo(v as TarefaTipo)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="generica">Genérica</SelectItem>
                  <SelectItem value="followup">Follow-up</SelectItem>
                  <SelectItem value="renovacao">Renovação</SelectItem>
                  <SelectItem value="reuniao_prep">Reunião</SelectItem>
                  <SelectItem value="upsell">Upsell</SelectItem>
                  <SelectItem value="diagnostico">Diagnóstico</SelectItem>
                  <SelectItem value="proposta">Proposta</SelectItem>
                  <SelectItem value="cobranca">Cobrança</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-fg2 mb-1 block">Prioridade</label>
              <Select value={prioridade} onValueChange={v => setPrioridade(v as TarefaPrioridade)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-fg2 mb-1 block">Vencimento</label>
              <Input type="datetime-local" value={dataVencimento} onChange={e => setDataVencimento(e.target.value)} className="h-9 text-xs" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); reset() }} disabled={busy}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={busy || !titulo.trim()} style={{ backgroundColor: '#0089ac' }}>
            Criar tarefa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
