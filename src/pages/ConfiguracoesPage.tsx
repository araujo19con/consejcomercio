import { useState, useEffect } from 'react'
import { useConfiguracoes, useUpdateConfiguracoes, DEFAULT_METAS, DEFAULT_SERVICOS } from '@/hooks/useConfiguracoes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Settings, DollarSign, Plus, Trash2, Save, Trophy, Pencil, Tag, ToggleLeft, ToggleRight } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { SEGMENTS, BUDGET_OPTIONS, SERVICE_AREAS } from '@/lib/constants'
import type { ServicoConfig, MetasConfig, ServicoCategoria } from '@/types'

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORIA_OPTIONS: { value: ServicoCategoria; label: string; color: string }[] = [
  { value: 'societario',   label: 'Societário',         color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  { value: 'contratual',   label: 'Contratual',         color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { value: 'digital',      label: 'Digital / LGPD',     color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  { value: 'trabalhista',  label: 'Trabalhista',        color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { value: 'pi',           label: 'Prop. Intelectual',  color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { value: 'outro',        label: 'Outro',              color: 'bg-muted text-muted-foreground border' },
]

function categoriaCls(cat: ServicoCategoria): string {
  return CATEGORIA_OPTIONS.find(c => c.value === cat)?.color ?? CATEGORIA_OPTIONS[5].color
}
function categoriaLabel(cat: ServicoCategoria): string {
  return CATEGORIA_OPTIONS.find(c => c.value === cat)?.label ?? cat
}

// ─── Edit service modal ───────────────────────────────────────────────────────

type EditModalProps = {
  servico: ServicoConfig | null
  allServicos: ServicoConfig[]
  open: boolean
  onClose: () => void
  onSave: (s: ServicoConfig) => void
}

function EditServicoModal({ servico, allServicos, open, onClose, onSave }: EditModalProps) {
  const isNew = !servico
  const [form, setForm] = useState<ServicoConfig>(() => servico ?? {
    id: crypto.randomUUID().slice(0, 8),
    nome: '',
    descricao: '',
    categoria: 'outro',
    tipo: 'simples',
    valor: 0,
    area_direito: '',
    segmentos_icp: [],
    investimento_icp: [],
    cross_sells: [],
    up_sells: [],
    ativo: true,
  })

  useEffect(() => {
    if (servico) setForm(servico)
    else setForm({
      id: crypto.randomUUID().slice(0, 8),
      nome: '',
      descricao: '',
      categoria: 'outro',
      tipo: 'simples',
      valor: 0,
      area_direito: '',
      segmentos_icp: [],
      investimento_icp: [],
      cross_sells: [],
      up_sells: [],
      ativo: true,
    })
  }, [servico, open])

  function toggle<K extends 'segmentos_icp' | 'investimento_icp' | 'cross_sells' | 'up_sells'>(key: K, value: string) {
    setForm(p => ({
      ...p,
      [key]: (p[key] as string[]).includes(value)
        ? (p[key] as string[]).filter(v => v !== value)
        : [...(p[key] as string[]), value],
    }))
  }

  function handleSave() {
    if (!form.nome.trim()) { toast.error('Nome obrigatório'); return }
    onSave(form)
    onClose()
  }

  const otherServicos = allServicos.filter(s => s.id !== form.id)

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Novo Serviço' : 'Editar Serviço'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Nome + valor */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Nome do serviço *</Label>
              <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Registro de Marca no INPI" />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={v => setForm(p => ({ ...p, categoria: v as ServicoCategoria }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIA_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v as 'simples' | 'complexa' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simples">Simples</SelectItem>
                  <SelectItem value="complexa">Complexa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Valor base (R$)</Label>
              <Input type="number" value={form.valor} onChange={e => setForm(p => ({ ...p, valor: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Área do Direito</Label>
              <Select value={form.area_direito || '__none__'} onValueChange={v => setForm(p => ({ ...p, area_direito: v === '__none__' ? undefined : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Todas as áreas (assessoria/consultoria)</SelectItem>
                  {SERVICE_AREAS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea
              value={form.descricao}
              onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
              placeholder="Breve descrição do que este serviço inclui..."
              rows={2}
            />
          </div>

          {/* Segmentos ICP */}
          <div className="space-y-2">
            <Label>Segmentos Ideais (ICP)</Label>
            <div className="grid grid-cols-2 gap-1.5 p-3 rounded-lg" style={{ background: 'var(--alpha-bg-xs)', border: '1px solid var(--alpha-border)' }}>
              {SEGMENTS.map(s => (
                <label key={s.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.segmentos_icp.includes(s.value)}
                    onChange={() => toggle('segmentos_icp', s.value)}
                    className="rounded accent-primary"
                  />
                  <span className="text-xs text-fg2">{s.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Budget ICP */}
          <div className="space-y-2">
            <Label>Investimento Compatível (ICP)</Label>
            <div className="flex flex-wrap gap-2">
              {BUDGET_OPTIONS.map(b => {
                const sel = form.investimento_icp.includes(b.value)
                return (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => toggle('investimento_icp', b.value)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${sel ? 'bg-primary/20 text-primary border-primary/40' : 'border text-fg4 hover:border-fg3'}`}
                  >
                    {b.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Cross-sells */}
          {otherServicos.length > 0 && (
            <div className="space-y-2">
              <Label>Cross-sell <span className="text-fg4 font-normal text-xs">(serviços complementares)</span></Label>
              <div className="flex flex-wrap gap-2">
                {otherServicos.map(s => {
                  const sel = form.cross_sells.includes(s.id)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggle('cross_sells', s.id)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${sel ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'border text-fg4 hover:border-fg3'}`}
                    >
                      {s.nome}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Up-sells */}
          {otherServicos.length > 0 && (
            <div className="space-y-2">
              <Label>Up-sell <span className="text-fg4 font-normal text-xs">(upgrades ou expansões)</span></Label>
              <div className="flex flex-wrap gap-2">
                {otherServicos.map(s => {
                  const sel = form.up_sells.includes(s.id)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggle('up_sells', s.id)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${sel ? 'bg-violet-500/15 text-violet-400 border-violet-500/30' : 'border text-fg4 hover:border-fg3'}`}
                    >
                      {s.nome}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Ativo toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, ativo: !p.ativo }))}
              className={`transition-colors ${form.ativo ? 'text-emerald-400' : 'text-fg4'}`}
            >
              {form.ativo ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
            </button>
            <span className="text-sm text-fg2">Serviço {form.ativo ? 'ativo' : 'inativo'}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ConfiguracoesPage() {
  const { data: config, isLoading } = useConfiguracoes()
  const updateConfig = useUpdateConfiguracoes()

  const [alertaDias, setAlertaDias] = useState('60')
  const [servicos, setServicos] = useState<ServicoConfig[]>([])
  const [metas, setMetas] = useState<MetasConfig>(DEFAULT_METAS)
  const [editingServico, setEditingServico] = useState<ServicoConfig | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Sync local state when data loads from DB
  useEffect(() => {
    if (config) {
      setAlertaDias(String(config.alerta_renovacao_dias))
      setServicos(config.servicos)
      if (config.metas) setMetas({ ...DEFAULT_METAS, ...config.metas })
    }
  }, [config])

  function setMeta<K extends keyof MetasConfig>(key: K, value: MetasConfig[K]) {
    setMetas(prev => ({ ...prev, [key]: value }))
  }

  function openNew() {
    setEditingServico(null)
    setModalOpen(true)
  }

  function openEdit(s: ServicoConfig) {
    setEditingServico(s)
    setModalOpen(true)
  }

  function handleSaveServico(s: ServicoConfig) {
    setServicos(prev => {
      const idx = prev.findIndex(sv => sv.id === s.id)
      return idx >= 0 ? prev.map(sv => sv.id === s.id ? s : sv) : [...prev, s]
    })
  }

  function saveAll() {
    updateConfig.mutate({
      alerta_renovacao_dias: parseInt(alertaDias) || 60,
      servicos,
      metas,
    })
  }

  function resetToDefaults() {
    setServicos(DEFAULT_SERVICOS)
    toast.success('Serviços padrão restaurados — clique em Salvar para confirmar.')
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-6">Configurações</h1>
      <div className="max-w-2xl space-y-4">

        {/* Portfólio de Serviços */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Portfólio de Serviços
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={resetToDefaults} className="text-xs h-7 px-2.5">
                  Restaurar padrão
                </Button>
                <Button size="sm" onClick={openNew} className="bg-primary hover:bg-primary/90 h-7 px-2.5 text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Novo
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground -mt-1 mb-3">
              Gerencie os serviços oferecidos pela CONSEJ. Cada serviço pode ter ICP, cross-sells e up-sells para direcionar diagnósticos e prospecção.
            </p>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-[var(--alpha-bg-xs)] rounded-lg animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-1.5">
                {servicos.map(s => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                    style={{ background: 'var(--alpha-bg-xs)', border: '1px solid var(--alpha-border)', opacity: s.ativo ? 1 : 0.5 }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{s.nome}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${categoriaCls(s.categoria)}`}>
                          <Tag className="w-2.5 h-2.5 inline mr-0.5" />{categoriaLabel(s.categoria)}
                        </span>
                        {!s.ativo && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full border bg-muted text-muted-foreground">Inativo</span>
                        )}
                      </div>
                      {s.descricao && <p className="text-xs text-fg4 mt-0.5 truncate">{s.descricao}</p>}
                    </div>
                    <span className="text-sm font-semibold text-fg2 shrink-0">{formatCurrency(s.valor)}</span>
                    <button
                      onClick={() => openEdit(s)}
                      className="p-1.5 rounded-lg hover:bg-[var(--alpha-bg-md)] text-fg4 hover:text-fg2 transition-colors shrink-0"
                      title="Editar serviço"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setServicos(prev => prev.filter(sv => sv.id !== s.id))}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-fg4 hover:text-red-500 transition-colors shrink-0"
                      title="Remover serviço"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {servicos.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhum serviço cadastrado.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alertas de renovação */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4" /> Alertas de Renovação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Alertar quando faltarem (dias)</Label>
              <Input
                type="number"
                value={alertaDias}
                onChange={e => setAlertaDias(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Save button */}
        <Button onClick={saveAll} disabled={updateConfig.isPending} className="bg-primary hover:bg-primary/90">
          <Save className="w-3.5 h-3.5 mr-1.5" />
          {updateConfig.isPending ? 'Salvando...' : 'Salvar Configurações'}
        </Button>

        {/* Gamificação */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4" /> Gamificação & Metas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-xs text-muted-foreground">Configure as metas mensais do time e os pontos por ação.</p>

            {/* Monthly goals */}
            <div>
              <p className="text-xs font-semibold text-fg4 uppercase tracking-wider mb-3">Metas mensais do time</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Deals fechados / mês</Label>
                  <Input type="number" value={metas.meta_leads_mes}
                    onChange={e => setMeta('meta_leads_mes', parseInt(e.target.value) || 0)} className="max-w-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label>MRR alvo (R$)</Label>
                  <Input type="number" value={metas.meta_mrr_mes}
                    onChange={e => setMeta('meta_mrr_mes', parseInt(e.target.value) || 0)} className="max-w-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label>Diagnósticos / mês</Label>
                  <Input type="number" value={metas.meta_diagnosticos_mes}
                    onChange={e => setMeta('meta_diagnosticos_mes', parseInt(e.target.value) || 0)} className="max-w-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label>Reuniões / mês</Label>
                  <Input type="number" value={metas.meta_reunioes_mes}
                    onChange={e => setMeta('meta_reunioes_mes', parseInt(e.target.value) || 0)} className="max-w-xs" />
                </div>
              </div>
            </div>

            {/* Point values */}
            <div>
              <p className="text-xs font-semibold text-fg4 uppercase tracking-wider mb-3">Pontos por ação</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ['pontos_lead_criado', 'Lead prospectado'],
                  ['pontos_proposta', 'Proposta enviada'],
                  ['pontos_negociacao', 'Negociação iniciada'],
                  ['pontos_diagnostico', 'Diagnóstico aplicado'],
                  ['pontos_reuniao', 'Reunião realizada'],
                  ['pontos_indicacao', 'Indicação gerada'],
                  ['pontos_ganho_assessoria', 'Deal ganho — Assessoria'],
                  ['pontos_ganho_consultoria', 'Deal ganho — Consultoria'],
                ] as [keyof MetasConfig, string][]).map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <Label>{label}</Label>
                    <Input
                      type="number"
                      value={metas[key] as number}
                      onChange={e => setMeta(key, parseInt(e.target.value) || 0)}
                      className="max-w-xs"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Reward description */}
            <div className="space-y-1.5">
              <Label>Recompensa do mês <span className="text-fg4 text-xs font-normal">(exibida no Ranking)</span></Label>
              <Textarea
                value={metas.recompensa_descricao}
                onChange={e => setMeta('recompensa_descricao', e.target.value)}
                placeholder="Ex: Quem fechar mais em Abril ganha almoço pago pela equipe! 🎉"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Sobre o Sistema</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">CONSEJ CRM v2.0</p>
            <p className="text-xs text-fg4 mt-1">Assessoria Jurídica Júnior — Gestão de relacionamento com clientes e leads passivos.</p>
          </CardContent>
        </Card>
      </div>

      <EditServicoModal
        servico={editingServico}
        allServicos={servicos}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveServico}
      />
    </div>
  )
}
