import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLeads, useCreateLead } from '@/hooks/useLeads'
import { useConfiguracoes } from '@/hooks/useConfiguracoes'
import { LEAD_SOURCES, SEGMENTS, PIPELINE_STAGES, BUDGET_OPTIONS } from '@/lib/constants'
import { SearchInput } from '@/components/ui/search-input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Phone, Mail, Copy, Check, ExternalLink, X, Target, Users, PhoneCall,
  MessageCircle, Search, Building2, MapPin, Briefcase, Plus, List, Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import { formatCNPJ, cleanCNPJ, lookupCnpj, cnaeToSegmento, formatCnpjPhone, type CnpjState, type CnpjData } from '@/lib/cnpj'
import type { Lead } from '@/types'
import type { ServicoConfig } from '@/types'

// ─── Scoring ──────────────────────────────────────────────────────────────────

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
  if (lead.status === 'negociacao')         s += 12
  if (lead.status === 'proposta_comercial') s += 8
  const daysOld = (Date.now() - new Date(lead.created_at).getTime()) / 86_400_000
  if (daysOld < 30) s += 8
  else if (daysOld < 60) s += 4
  return Math.min(s, 100)
}

function calcServiceScore(lead: Lead, servico: ServicoConfig): number {
  let s = calcScore(lead)
  // ICP match from catalog fields
  if (servico.segmentos_icp?.length && servico.segmentos_icp.includes(lead.segmento)) s += 15
  if (servico.investimento_icp?.length && lead.investimento_estimado &&
      servico.investimento_icp.includes(lead.investimento_estimado)) s += 12
  // Complexity bonus/penalty
  if (servico.tipo === 'complexa') {
    if (lead.investimento_estimado === 'acima_10k') s += 10
    else if (!['5k_10k', 'acima_10k'].includes(lead.investimento_estimado ?? '')) s -= 5
  }
  // Explicit interest match by service ID or name
  if (lead.servicos_interesse?.some(si =>
    si === servico.id ||
    si.toLowerCase().includes(servico.nome.toLowerCase()) ||
    servico.nome.toLowerCase().includes(si.toLowerCase())
  )) s += 25
  return Math.min(s, 100)
}

// ─── Templates ────────────────────────────────────────────────────────────────

function buildTemplate(lead: Lead, servico?: ServicoConfig): string {
  const fn = lead.nome.split(' ')[0]
  const emp = lead.empresa
  if (!servico) {
    return `Olá, ${fn}! 👋 Aqui é da CONSEJ Assessoria Jurídica. Gostaríamos de entender as necessidades jurídicas da ${emp}. Podemos conversar esta semana?`
  }
  const n = servico.nome.toLowerCase()
  if (n.includes('marca') || n.includes('brand'))
    return `Olá, ${fn}! 👋 Sou da CONSEJ. A ${emp} tem interesse em proteger sua marca? O Registro garante exclusividade e evita disputas. Nossos honorários são acessíveis — posso te enviar mais detalhes?`
  if (n.includes('trabalhist') || n.includes('clt') || n.includes('emprego') || n.includes('rescis'))
    return `Olá, ${fn}! 👋 Sou da CONSEJ. Empresas como a ${emp} costumam ter demandas trabalhistas. Oferecemos assessoria preventiva e representação a preços juníores. Podemos conversar?`
  if (n.includes('contrato') || n.includes('societár') || n.includes('social'))
    return `Olá, ${fn}! 👋 Sou da CONSEJ. Ajudamos empresas a estruturar contratos sólidos. Para a ${emp}, isso evita disputas e protege o negócio. Posso compartilhar como funciona?`
  if (n.includes('consultoria') || n.includes('empresarial'))
    return `Olá, ${fn}! 👋 Entro em contato pela CONSEJ. A ${emp} pode se beneficiar de consultoria jurídica especializada. Temos planos acessíveis para cada fase do negócio. Quer saber mais?`
  if (n.includes('inventário') || n.includes('herança') || n.includes('sucess'))
    return `Olá, ${fn}! 👋 Sou da CONSEJ. Facilitamos processos de inventário com menos burocracia e custo reduzido. Posso explicar como funciona o nosso processo?`
  return `Olá, ${fn}! 👋 Sou da CONSEJ Assessoria Jurídica. Identificamos que a ${emp} pode se beneficiar do nosso serviço *${servico.nome}* (${formatCurrency(servico.valor)}). Podemos agendar uma conversa rápida?`
}

function openWhatsApp(lead: Lead, servico?: ServicoConfig) {
  if (!lead.telefone) return
  const phone = lead.telefone.replace(/\D/g, '')
  const intl = phone.startsWith('55') ? phone : `55${phone}`
  const msg = buildTemplate(lead, servico)
  window.open(`https://wa.me/${intl}?text=${encodeURIComponent(msg)}`, '_blank')
}

// ─── ScoreBadge ───────────────────────────────────────────────────────────────

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

// ─── CopyBtn ──────────────────────────────────────────────────────────────────

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
    <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group" title={`Copiar: ${value}`}>
      <Icon className="w-3 h-3 shrink-0" />
      <span className="max-w-[140px] truncate">{value}</span>
      {copied ? <Check className="w-3 h-3 text-emerald-400 ml-0.5" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-60 ml-0.5 transition-opacity" />}
    </button>
  )
}

// ─── LeadRow ──────────────────────────────────────────────────────────────────

const STAGE_PILL: Record<string, string> = {
  classificacao:             'bg-sky-500/10 text-sky-400 border-sky-500/20',
  levantamento_oportunidade: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  educar_lead:               'bg-violet-500/10 text-violet-400 border-violet-500/20',
  proposta_comercial:        'bg-amber-500/10 text-amber-400 border-amber-500/20',
  negociacao:                'bg-orange-500/10 text-orange-400 border-orange-500/20',
  stand_by:                  'bg-muted text-muted-foreground border',
}

function LeadRow({ lead, score, servico }: { lead: Lead; score: number; servico?: ServicoConfig }) {
  const navigate = useNavigate()
  const stage = PIPELINE_STAGES.find(s => s.id === lead.status)
  const origem = LEAD_SOURCES.find(o => o.value === lead.origem)
  return (
    <div className="bg-card border rounded-xl px-4 py-3 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => navigate(`/leads/${lead.id}`)}>
      <div className="flex items-center gap-3">
        <div className="shrink-0 hidden sm:block"><ScoreBadge score={score} /></div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate text-sm">{lead.empresa}</p>
          <p className="text-xs text-muted-foreground truncate">{lead.nome}</p>
        </div>
        <div className="shrink-0 hidden md:flex flex-col gap-0.5 min-w-0 w-40">
          {lead.telefone ? <CopyBtn value={lead.telefone} icon={Phone} /> : <span className="text-xs text-fg4">Sem telefone</span>}
          {lead.email && <CopyBtn value={lead.email} icon={Mail} />}
        </div>
        <div className="shrink-0 hidden lg:block">
          <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', STAGE_PILL[lead.status] ?? 'bg-muted text-muted-foreground border')}>
            {stage?.label ?? lead.status}
          </span>
        </div>
        <div className="shrink-0 hidden xl:block w-28">
          <p className="text-xs text-muted-foreground truncate">{origem?.label ?? lead.origem?.replace(/_/g, ' ')}</p>
        </div>
        {/* WhatsApp */}
        {lead.telefone && (
          <button
            onClick={e => { e.stopPropagation(); openWhatsApp(lead, servico) }}
            className="shrink-0 p-1.5 rounded-lg transition-colors hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400"
            title={servico ? `Mensagem sobre ${servico.nome}` : 'Mensagem de prospecção'}
          >
            <MessageCircle className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={e => { e.stopPropagation(); navigate(`/leads/${lead.id}`) }}
          className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── ServiceCard ──────────────────────────────────────────────────────────────

const SEGMENT_LABELS: Record<string, string> = {
  empresa_junior: 'EJ', empresa_senior: 'Empresa Sênior', startup: 'Startup',
  escritorio_arquitetura: 'Arq.', empresa_design: 'Design', empresa_gestao: 'Gestão', outro: 'Outro',
}

function getServiceICP(servico: ServicoConfig): string {
  // Prefer catalog description if available
  if (servico.descricao) return servico.descricao
  // Fallback: build from segmentos_icp
  if (servico.segmentos_icp?.length) {
    return servico.segmentos_icp.map(s => SEGMENT_LABELS[s] ?? s).join(', ')
  }
  if (servico.tipo === 'complexa') return 'Startups e empresas sênior com demandas recorrentes e ticket elevado'
  return 'Pequenas empresas e EJs com necessidades jurídicas pontuais'
}

function ServiceCard({ servico, leads }: { servico: ServicoConfig; leads: Lead[] }) {
  const [expanded, setExpanded] = useState(false)
  const scored = useMemo(
    () => leads
      .filter(l => ACTIVE_STAGES.includes(l.status))
      .map(l => ({ lead: l, score: calcServiceScore(l, servico) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10),
    [leads, servico]
  )
  const icp = getServiceICP(servico)

  return (
    <div className="bg-card border rounded-xl overflow-hidden transition-all">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-[rgba(255,255,255,0.03)] transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-semibold text-foreground">{servico.nome}</p>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium',
              servico.tipo === 'complexa'
                ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
            )}>
              {servico.tipo === 'complexa' ? 'Complexa' : 'Simples'}
            </span>
            <span className="text-xs text-muted-foreground">{formatCurrency(servico.valor)}</span>
          </div>
          <p className="text-xs text-fg4 truncate" title={icp}>{icp}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-bold text-foreground">{scored.length}</p>
          <p className="text-xs text-muted-foreground">leads qualificados</p>
        </div>
        <div className={cn('w-4 h-4 text-fg4 transition-transform', expanded && 'rotate-180')}>▾</div>
      </button>

      {expanded && (
        <div className="border-t px-5 pb-4 space-y-1.5 pt-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {scored.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum lead qualificado para este serviço.</p>
          ) : (
            scored.map(({ lead, score }) => (
              <LeadRow key={lead.id} lead={lead} score={score} servico={servico} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── CnpjProspectForm ─────────────────────────────────────────────────────────

function CnpjProspectForm({ onCreated }: { onCreated: () => void }) {
  const [cnpjInput, setCnpjInput] = useState('')
  const [state, setState] = useState<CnpjState>({ status: 'idle' })
  const [nomeContato, setNomeContato] = useState('')
  const [telefone, setTelefone] = useState('')
  const [segmento, setSegmento] = useState('')
  const [origem, setOrigem] = useState('outro')
  const [servicoNome, setServicoNome] = useState('')
  const { data: config } = useConfiguracoes()
  const createLead = useCreateLead()

  function handleCnpjChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCnpjInput(formatCNPJ(e.target.value))
  }

  async function handleLookup() {
    if (cleanCNPJ(cnpjInput).length !== 14) return
    setState({ status: 'loading' })
    try {
      const data = await lookupCnpj(cnpjInput)
      if (data.situacao_cadastral !== 2) {
        setState({ status: 'error', message: `Empresa ${data.descricao_situacao_cadastral ?? 'inativa'} na Receita Federal` })
        return
      }
      setState({ status: 'success', data })
      setNomeContato(data.qsa?.[0]?.nome_socio ?? '')
      setTelefone(data.ddd_telefone_1 ? formatCnpjPhone(data.ddd_telefone_1) : '')
      setSegmento(cnaeToSegmento(data.cnae_fiscal))
    } catch (err) {
      setState({ status: 'error', message: (err as Error).message })
    }
  }

  function handleCreate() {
    if (state.status !== 'success') return
    const d = state.data
    createLead.mutate({
      nome: nomeContato || d.razao_social,
      empresa: d.nome_fantasia || d.razao_social,
      telefone,
      email: d.email || null,
      estado: d.uf || null,
      segmento: segmento || 'outro',
      origem: origem as string,
      status: 'classificacao',
      servicos_interesse: servicoNome ? [servicoNome] : [],
      notas: `Prospectado via CNPJ\nCNPJ: ${d.cnpj}\nCNAE: ${d.cnae_fiscal} — ${d.descricao_cnae_fiscal ?? ''}\nMunicípio: ${d.municipio ?? ''} / ${d.uf ?? ''}\nPorte: ${d.porte ?? ''}`,
      responsavel: null,
      responsavel_id: null,
      referido_por_cliente_id: null,
      referido_por_parceiro_id: null,
      data_diagnostico: null,
      motivo_perda: null,
      investimento_estimado: null,
    }, {
      onSuccess: () => {
        setState({ status: 'idle' })
        setCnpjInput('')
        setNomeContato('')
        setTelefone('')
        setSegmento('')
        setServicoNome('')
        onCreated()
      },
    })
  }

  const data: CnpjData | undefined = state.status === 'success' ? state.data : undefined

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <Label>CNPJ da empresa</Label>
        <div className="flex gap-2 mt-1.5">
          <Input
            value={cnpjInput}
            onChange={handleCnpjChange}
            placeholder="00.000.000/0001-00"
            className="font-mono max-w-xs"
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
          />
          <Button
            onClick={handleLookup}
            disabled={cleanCNPJ(cnpjInput).length !== 14 || state.status === 'loading'}
            className="bg-primary hover:bg-primary/90"
          >
            {state.status === 'loading' ? (
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <><Search className="w-4 h-4 mr-1.5" />Buscar</>
            )}
          </Button>
        </div>
        {state.status === 'error' && (
          <p className="text-xs text-red-400 mt-1.5">{state.message}</p>
        )}
      </div>

      {data && (
        <>
          {/* Company card */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{data.nome_fantasia || data.razao_social}</p>
                  {data.nome_fantasia && <p className="text-xs text-fg4">{data.razao_social}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
                    {data.uf && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />{data.municipio} — {data.uf}
                      </span>
                    )}
                    {data.porte && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Briefcase className="w-3 h-3" />{data.porte}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-fg4 mt-1">CNAE: {data.cnae_fiscal} — {data.descricao_cnae_fiscal}</p>
                </div>
              </div>
              {data.qsa && data.qsa.length > 0 && (
                <div className="border-t pt-2 mt-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <p className="text-xs font-medium text-fg4 mb-1">Quadro societário</p>
                  {data.qsa.slice(0, 3).map((s, i) => (
                    <p key={i} className="text-xs text-muted-foreground">{s.nome_socio} <span className="text-fg4">— {s.qual_socio_descricao}</span></p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lead fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Contato principal</Label>
              <Input value={nomeContato} onChange={e => setNomeContato(e.target.value)} placeholder="Nome do sócio/representante" />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-1.5">
              <Label>Segmento</Label>
              <select value={segmento} onChange={e => setSegmento(e.target.value)} className="form-control-sm w-full">
                <option value="">Selecione</option>
                {SEGMENTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Origem</Label>
              <select value={origem} onChange={e => setOrigem(e.target.value)} className="form-control-sm w-full">
                {LEAD_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Serviço de interesse</Label>
              <select value={servicoNome} onChange={e => setServicoNome(e.target.value)} className="form-control-sm w-full">
                <option value="">Não definido</option>
                {(config?.servicos ?? []).filter(s => s.ativo !== false).map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
          </div>

          <Button
            onClick={handleCreate}
            disabled={createLead.isPending || !nomeContato || !telefone || !segmento}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            {createLead.isPending ? 'Criando...' : 'Criar lead'}
          </Button>
        </>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: 'score',   label: 'Prioridade' },
  { value: 'recente', label: 'Mais recente' },
  { value: 'empresa', label: 'Empresa A-Z' },
]

export function ProspeccaoPage() {
  const { data: leads = [], isLoading } = useLeads()
  const { data: config } = useConfiguracoes()
  const [search, setSearch]         = useState('')
  const [segmento, setSegmento]     = useState('todos')
  const [estagio, setEstagio]       = useState('todos')
  const [origem, setOrigem]         = useState('todos')
  const [investimento, setInvestimento] = useState('todos')
  const [apenasComContato, setApenasComContato] = useState(false)
  const [sort, setSort]             = useState('score')
  const [activeTab, setActiveTab]   = useState('lista')

  const { qualified, scored } = useMemo(() => {
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
            <Target className="w-5 h-5 text-primary" />Prospecção Ativa
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Qualifique, enriqueça e entre em contato com seus prospects</p>
        </div>
      </div>

      {/* Stats */}
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="lista" className="flex items-center gap-1.5">
            <List className="w-3.5 h-3.5" />Lista
          </TabsTrigger>
          <TabsTrigger value="por-servico" className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />Por Serviço
          </TabsTrigger>
          <TabsTrigger value="novo-prospect" className="flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />Novo Prospect
          </TabsTrigger>
        </TabsList>

        {/* ── Lista ── */}
        <TabsContent value="lista" className="space-y-3 mt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar empresa ou representante…" className="w-52" />
            <select value={segmento} onChange={e => setSegmento(e.target.value)} className={selectCls}>
              <option value="todos">Todos os segmentos</option>
              {SEGMENTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select value={estagio} onChange={e => setEstagio(e.target.value)} className={selectCls}>
              <option value="todos">Todos os estágios</option>
              {ACTIVE_STAGES.map(id => {
                const st = PIPELINE_STAGES.find(s => s.id === id)
                return <option key={id} value={id}>{st?.label ?? id}</option>
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
            <button
              onClick={() => setApenasComContato(v => !v)}
              className={cn('h-8 px-2.5 flex items-center gap-1.5 text-xs rounded-lg border transition-colors',
                apenasComContato ? 'bg-primary/15 border-primary/40 text-primary font-medium' : 'bg-card text-muted-foreground hover:text-foreground'
              )}
            >
              <Phone className="w-3 h-3" />Só com contato
            </button>
            <select value={sort} onChange={e => setSort(e.target.value)} className={cn(selectCls, 'ml-auto')}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>Ordenar: {o.label}</option>)}
            </select>
            {hasFilter && (
              <button
                onClick={() => { setSearch(''); setSegmento('todos'); setEstagio('todos'); setOrigem('todos'); setInvestimento('todos'); setApenasComContato(false) }}
                className="h-8 px-2.5 flex items-center gap-1 text-xs rounded-lg border text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3 h-3" /> Limpar
              </button>
            )}
          </div>

          <div className="hidden md:grid px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
            style={{ gridTemplateColumns: '80px 1fr 180px 160px 120px 64px' }}>
            <span>Score</span><span>Empresa / Representante</span><span>Contato</span>
            <span>Estágio</span><span className="hidden lg:block">Origem</span><span />
          </div>

          {hasFilter && (
            <p className="text-xs text-muted-foreground">
              Exibindo <span className="font-semibold text-foreground">{qualified.length}</span> de {stats.total} leads
            </p>
          )}

          <div className="space-y-1.5">
            {qualified.map(({ lead, score }) => <LeadRow key={lead.id} lead={lead} score={score} />)}
            {qualified.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum lead encontrado com esses filtros.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Por Serviço ── */}
        <TabsContent value="por-servico" className="space-y-3 mt-3">
          <p className="text-sm text-muted-foreground">
            Leads do pipeline qualificados e ordenados para cada serviço. Clique num serviço para expandir a lista e enviar mensagens.
          </p>
          {(config?.servicos ?? []).length === 0 ? (
            <div className="text-center py-12 text-fg4">
              <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum serviço configurado. Adicione em <strong>Configurações → Serviços e Valores</strong>.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(config?.servicos ?? []).map(s => (
                <ServiceCard key={s.id} servico={s} leads={leads} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Novo Prospect ── */}
        <TabsContent value="novo-prospect" className="mt-3">
          <div className="mb-4">
            <h2 className="font-semibold text-foreground">Enriquecer via CNPJ</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Busque qualquer empresa pelo CNPJ e crie um lead com dados pré-preenchidos da Receita Federal.
            </p>
          </div>
          <CnpjProspectForm onCreated={() => setActiveTab('lista')} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
