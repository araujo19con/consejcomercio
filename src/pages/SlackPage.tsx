import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Hash, Lock, RefreshCw, ChevronDown, Calendar, UserSearch, AlertCircle, ExternalLink, Settings, Sparkles, TrendingUp, Check, X } from 'lucide-react'
import {
  listChannels,
  getMessages,
  tsToDate,
  formatSlackText,
  classifyMessage,
  type SlackChannel,
  type SlackMessage,
  type MessageClassification,
} from '@/lib/slack'
import { detectSuggestions, type Suggestion, type ReuniaoSuggestion, type LeadSuggestion, type OportunidadeSuggestion, type IndicacaoSuggestion } from '@/lib/slack-suggestions'
import { NovaReuniaoModal } from '@/components/reunioes/NovaReuniaoModal'
import { NewLeadModal } from '@/components/leads/NewLeadModal'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const STORAGE_KEY = 'consej_slack_channels'
const CONFIRMED_KEY = 'consej_slack_confirmed'
const DISMISSED_KEY = 'consej_slack_dismissed'

function getSet(key: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(key) ?? '[]')) } catch { return new Set() }
}

// ─── Badges ────────────────────────────────────────────────────────────────

const BADGE_CONFIG: Record<Suggestion['type'], { label: string; bg: string; color: string; Icon: React.FC<{ className?: string }> }> = {
  reuniao:     { label: 'Reunião',      bg: 'rgba(59,130,246,0.15)',  color: '#93c5fd', Icon: Calendar    },
  lead:        { label: 'Novo Lead',    bg: 'rgba(16,185,129,0.15)',  color: '#34d399', Icon: UserSearch  },
  oportunidade:{ label: 'Oportunidade', bg: 'rgba(139,92,246,0.15)',  color: '#a78bfa', Icon: TrendingUp  },
  indicacao:   { label: 'Indicação',    bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24', Icon: Sparkles    },
}

function TypeBadge({ type }: { type: Suggestion['type'] }) {
  const cfg = BADGE_CONFIG[type]
  if (!cfg) return null
  const { label, bg, color, Icon } = cfg
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: bg, color }}>
      <Icon className="w-3 h-3" />{label}
    </span>
  )
}

// ─── Suggestion Cards ────────────────────────────────────────────────────────

function SuggestionCard({
  suggestion,
  onConfirm,
  onDismiss,
  confirmed,
}: {
  suggestion: Suggestion
  onConfirm: (s: Suggestion) => void
  onDismiss: (id: string) => void
  confirmed: boolean
}) {
  const date = tsToDate(suggestion.message.ts)
  return (
    <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.04)', borderWidth: 2, borderStyle: 'solid', borderColor: confirmed ? 'rgba(16,185,129,0.30)' : 'rgba(245,158,11,0.35)', opacity: confirmed ? 0.75 : 1 }}>
      <div className="flex items-start justify-between gap-2">
        <TypeBadge type={suggestion.type} />
        <div className="flex items-center gap-1.5">
          {confirmed && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[rgba(16,185,129,0.15)] text-[#34d399]">
              <Check className="w-3 h-3" />Confirmado
            </span>
          )}
          <span className="text-xs text-fg4">#{suggestion.channelName}</span>
        </div>
      </div>

      {suggestion.type === 'reuniao' && (
        <div>
          <p className="text-sm font-semibold text-foreground">{(suggestion as ReuniaoSuggestion).titulo}</p>
          {(suggestion as ReuniaoSuggestion).dataHora && (
            <p className="text-xs text-muted-foreground">
              📅 {(suggestion as ReuniaoSuggestion).dataHora!.toLocaleDateString('pt-BR')} às{' '}
              {(suggestion as ReuniaoSuggestion).dataHora!.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          {(suggestion as ReuniaoSuggestion).link && (
            <p className="text-xs text-blue-500 truncate">🔗 {(suggestion as ReuniaoSuggestion).link}</p>
          )}
        </div>
      )}

      {suggestion.type === 'lead' && (
        <div className="text-sm text-muted-foreground space-y-0.5">
          {(suggestion as LeadSuggestion).nome && (
            <p className="font-medium text-fg2">👤 {(suggestion as LeadSuggestion).nome}</p>
          )}
          {(suggestion as LeadSuggestion).empresa && (
            <p>🏢 {(suggestion as LeadSuggestion).empresa}</p>
          )}
          {(suggestion as LeadSuggestion).telefone && <p>📱 {(suggestion as LeadSuggestion).telefone}</p>}
          {(suggestion as LeadSuggestion).email && <p>📧 {(suggestion as LeadSuggestion).email}</p>}
        </div>
      )}

      {suggestion.type === 'oportunidade' && (
        <div className="text-sm text-muted-foreground">
          <p className="text-xs text-muted-foreground line-clamp-2">{(suggestion as OportunidadeSuggestion).descricao}</p>
          {(suggestion as OportunidadeSuggestion).valorEstimado && (
            <p className="text-xs font-medium text-green-700 mt-1">
              💰 R$ {(suggestion as OportunidadeSuggestion).valorEstimado!.toLocaleString('pt-BR')}
            </p>
          )}
        </div>
      )}

      {suggestion.type === 'indicacao' && (
        <div className="text-sm text-muted-foreground space-y-0.5">
          {(suggestion as IndicacaoSuggestion).indicadoEmail && <p>📧 {(suggestion as IndicacaoSuggestion).indicadoEmail}</p>}
          {(suggestion as IndicacaoSuggestion).indicadoTelefone && <p>📱 {(suggestion as IndicacaoSuggestion).indicadoTelefone}</p>}
        </div>
      )}

      <p className="text-xs text-fg4 italic line-clamp-2 border-l-2 pl-2">
        "{formatSlackText(suggestion.rawText).slice(0, 120)}"
      </p>

      {!confirmed && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onConfirm(suggestion)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white font-medium"
            style={{ backgroundColor: '#0089ac' }}
          >
            <Check className="w-3 h-3" />Confirmar
          </button>
          <button
            onClick={() => onDismiss(suggestion.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground border hover:bg-background"
          >
            <X className="w-3 h-3" />Ignorar
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Message Card ────────────────────────────────────────────────────────────

const MSG_BADGE_CONFIG: Record<MessageClassification, { label: string; bg: string; color: string; Icon: React.FC<{ className?: string }> }> = {
  reuniao:     { label: 'Reunião',      bg: 'rgba(59,130,246,0.15)',  color: '#93c5fd', Icon: Calendar    },
  lead:        { label: 'Lead',         bg: 'rgba(16,185,129,0.15)',  color: '#34d399', Icon: UserSearch  },
  oportunidade:{ label: 'Oportunidade', bg: 'rgba(139,92,246,0.15)',  color: '#a78bfa', Icon: TrendingUp  },
  indicacao:   { label: 'Indicação',    bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24', Icon: Sparkles    },
  demanda:     { label: 'Demanda',      bg: 'rgba(239,68,68,0.15)',   color: '#fca5a5', Icon: AlertCircle },
  contrato:    { label: 'Contrato',     bg: 'rgba(6,182,212,0.15)',   color: '#67e8f9', Icon: Check       },
}

function MessageBadge({ type }: { type: MessageClassification }) {
  const cfg = MSG_BADGE_CONFIG[type]
  if (!cfg) return null
  const { label, bg, color, Icon } = cfg
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: bg, color }}>
      <Icon className="w-3 h-3" />{label}
    </span>
  )
}

function MessageCard({ msg }: { msg: SlackMessage }) {
  const classification = classifyMessage(msg.text)
  const date = tsToDate(msg.ts)
  return (
    <div className="bg-card border rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-foreground whitespace-pre-wrap break-words flex-1">
          {formatSlackText(msg.text) || <span className="italic text-fg4">[mensagem sem texto]</span>}
        </p>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {classification && <MessageBadge type={classification} />}
          <span className="text-xs text-fg4 whitespace-nowrap">
            {date.toLocaleDateString('pt-BR')} {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Channel Messages ─────────────────────────────────────────────────────────

function ChannelMessages({
  channelId,
  onMessagesLoaded,
}: {
  channelId: string
  onMessagesLoaded: (msgs: SlackMessage[]) => void
}) {
  type FilterType = 'todos' | MessageClassification
  const [filter, setFilter] = useState<FilterType>('todos')

  const { data: messages, isLoading, error, refetch } = useQuery<SlackMessage[]>({
    queryKey: ['slack-messages', channelId],
    queryFn: async () => {
      const msgs = await getMessages(channelId, 50)
      onMessagesLoaded(msgs)
      return msgs
    },
    staleTime: 1000 * 60 * 2,
    retry: false,
  })

  const filtered = (messages ?? []).filter(m => {
    if (m.subtype) return false
    if (filter === 'todos') return true
    return classifyMessage(m.text) === filter
  })

  const filterTabs: { value: FilterType; label: string }[] = [
    { value: 'todos',       label: 'Todos' },
    { value: 'reuniao',     label: 'Reuniões' },
    { value: 'lead',        label: 'Leads' },
    { value: 'oportunidade',label: 'Oportunidades' },
    { value: 'indicacao',   label: 'Indicações' },
    { value: 'demanda',     label: 'Demandas' },
    { value: 'contrato',    label: 'Contratos' },
  ]

  return (
    <div className="mt-3">
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {filterTabs.map(f => {
          const isActive = filter === f.value
          const cfg = f.value !== 'todos' ? MSG_BADGE_CONFIG[f.value as MessageClassification] : null
          return (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors border"
              style={isActive && cfg
                ? { background: cfg.bg, color: cfg.color, borderColor: `${cfg.color}44` }
                : isActive
                ? { background: 'rgba(255,255,255,0.12)', color: '#fff', borderColor: 'rgba(255,255,255,0.20)' }
                : { background: 'transparent', color: 'rgba(150,165,180,0.70)', borderColor: 'rgba(255,255,255,0.07)' }
              }
            >
              {f.label}
            </button>
          )
        })}
        <button onClick={() => refetch()} className="ml-auto p-1.5 rounded-md text-fg4 hover:text-muted-foreground hover:bg-[rgba(255,255,255,0.04)]">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
      {isLoading && <div className="text-center py-8 text-fg4 text-sm">Carregando mensagens...</div>}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
          <AlertCircle className="w-4 h-4 shrink-0" />{(error as Error).message}
        </div>
      )}
      {!isLoading && !error && filtered.length === 0 && (
        <div className="text-center py-8 text-fg4 text-sm">Nenhuma mensagem encontrada.</div>
      )}
      <div className="space-y-2">
        {filtered.map(msg => <MessageCard key={msg.ts} msg={msg} />)}
      </div>
    </div>
  )
}

// ─── Channel Accordion ─────────────────────────────────────────────────────────

function ChannelAccordion({ channel, onMessages }: {
  channel: SlackChannel
  onMessages: (channelId: string, channelName: string, msgs: SlackMessage[]) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-[rgba(255,255,255,0.05)] transition-colors text-left">
        {channel.is_private ? <Lock className="w-4 h-4 text-fg4 shrink-0" /> : <Hash className="w-4 h-4 text-fg4 shrink-0" />}
        <span className="font-medium text-foreground flex-1">{channel.name}</span>
        {channel.num_members > 0 && <span className="text-xs text-fg4">{channel.num_members} membros</span>}
        <ChevronDown className={`w-4 h-4 text-fg4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 bg-background border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <ChannelMessages
            channelId={channel.id}
            onMessagesLoaded={msgs => onMessages(channel.id, channel.name, msgs)}
          />
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function SlackPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
  })
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(getSet(CONFIRMED_KEY))
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(getSet(DISMISSED_KEY))
  const [channelMessages, setChannelMessages] = useState<Record<string, { name: string; msgs: SlackMessage[] }>>({})
  const [showSelector, setShowSelector] = useState(false)
  const [search, setSearch] = useState('')
  const [reuniaoModal, setReuniaoModal] = useState<{ open: boolean; suggestionId?: string; prefill?: Parameters<typeof NovaReuniaoModal>[0]['prefill'] }>({ open: false })
  const [leadModal, setLeadModal] = useState<{ open: boolean; suggestionId?: string; prefill?: { nome?: string; empresa?: string; telefone?: string; email?: string; origem?: string; notas?: string } }>({ open: false })

  const { data: allChannels, isLoading, error } = useQuery<SlackChannel[]>({
    queryKey: ['slack-channels'],
    queryFn: listChannels,
    staleTime: 1000 * 60 * 10,
    retry: false,
  })

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedIds)) }, [selectedIds])
  useEffect(() => { localStorage.setItem(CONFIRMED_KEY, JSON.stringify([...confirmedIds])) }, [confirmedIds])
  useEffect(() => { localStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissedIds])) }, [dismissedIds])

  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }, [])

  const handleMessages = useCallback((channelId: string, channelName: string, msgs: SlackMessage[]) => {
    setChannelMessages(prev => ({ ...prev, [channelId]: { name: channelName, msgs } }))
  }, [])

  // Collect all suggestions
  const allSuggestions: Suggestion[] = Object.entries(channelMessages).flatMap(([cid, { name, msgs }]) =>
    detectSuggestions(msgs, cid, name, confirmedIds, dismissedIds)
  )

  async function handleConfirm(suggestion: Suggestion) {
    if (suggestion.type === 'reuniao') {
      const r = suggestion as ReuniaoSuggestion
      setReuniaoModal({
        open: true,
        suggestionId: suggestion.id,
        prefill: {
          titulo: r.titulo,
          dataHora: r.dataHora,
          link_video: r.link,
          slack_ts: r.message.ts,
          slack_channel: r.channelId,
        },
      })
    } else if (suggestion.type === 'lead') {
      const l = suggestion as LeadSuggestion
      setLeadModal({
        open: true,
        suggestionId: suggestion.id,
        prefill: {
          nome:     l.nome,
          empresa:  l.empresa,
          telefone: l.telefone,
          email:    l.email,
          origem:   'slack',
          notas:    l.notas ?? `Detectado no canal #${l.channelName}\n\n"${l.rawText.slice(0, 400)}"`,
        },
      })
    } else if (suggestion.type === 'oportunidade') {
      const o = suggestion as OportunidadeSuggestion
      try {
        await supabase.from('oportunidades').insert([{
          titulo: `Oportunidade do Slack #${o.channelName}`,
          descricao: o.descricao,
          valor_estimado: o.valorEstimado,
          status: 'aberta',
          origem: 'slack',
        }])
        toast.success('Oportunidade criada!')
        markConfirmed(suggestion.id)
      } catch { toast.error('Erro ao criar oportunidade') }
    } else if (suggestion.type === 'indicacao') {
      const ind = suggestion as IndicacaoSuggestion
      try {
        await supabase.from('indicacoes').insert([{
          indicado_nome: ind.indicadoNome ?? 'Indicado via Slack',
          indicado_telefone: ind.indicadoTelefone ?? '',
          indicado_email: ind.indicadoEmail ?? null,
          status: 'pendente',
          notas: `Detectado no canal #${ind.channelName}\n\n"${ind.rawText.slice(0, 300)}"`,
        }])
        toast.success('Indicação registrada!')
        markConfirmed(suggestion.id)
      } catch { toast.error('Erro ao registrar indicação') }
    }
  }

  function markConfirmed(id: string) {
    setConfirmedIds(prev => new Set([...prev, id]))
  }

  function handleDismiss(id: string) {
    setDismissedIds(prev => new Set([...prev, id]))
  }

  const monitoredChannels = (allChannels ?? []).filter(c => selectedIds.includes(c.id))
  const filteredAll = (allChannels ?? []).filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
  const isNotConfigured = error && (error as Error).message?.includes('SLACK_BOT_TOKEN')

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Slack</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Andamentos de reuniões e prospecção</p>
        </div>
        <button onClick={() => setShowSelector(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-fg2 hover:bg-[rgba(255,255,255,0.05)]" style={{ border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.04)' }}>
          <Settings className="w-4 h-4" />Gerenciar canais
        </button>
      </div>

      {/* Token warning */}
      {isNotConfigured && (
        <div className="p-4 rounded-xl" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#fbbf24' }} />
            <div className="text-sm">
              <p className="font-semibold" style={{ color: 'rgba(251,191,36,0.90)' }}>Slack não configurado</p>
              <p className="mt-1" style={{ color: 'rgba(251,191,36,0.75)' }}>Adicione <code className="px-1 rounded" style={{ background: 'rgba(245,158,11,0.20)', color: '#fbbf24' }}>SLACK_BOT_TOKEN</code> em Vercel → Settings → Environment Variables.</p>
              <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 mt-2 underline" style={{ color: 'rgba(251,191,36,0.75)' }}>
                Abrir Vercel <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions panel */}
      {allSuggestions.length > 0 && (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(0,137,172,0.06)', border: '1px solid rgba(0,137,172,0.25)' }}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: '#6bd0e7' }} />
            <h2 className="font-semibold text-fg2">
              {allSuggestions.filter(s => !confirmedIds.has(s.id)).length} sugestão
              {allSuggestions.filter(s => !confirmedIds.has(s.id)).length !== 1 ? 'ões' : ''} pendente
              {allSuggestions.filter(s => !confirmedIds.has(s.id)).length !== 1 ? 's' : ''}
              {allSuggestions.some(s => confirmedIds.has(s.id)) && (
                <span className="ml-2 font-normal text-sm" style={{ color: '#34d399' }}>
                  · {allSuggestions.filter(s => confirmedIds.has(s.id)).length} confirmada{allSuggestions.filter(s => confirmedIds.has(s.id)).length !== 1 ? 's' : ''}
                </span>
              )}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {allSuggestions.map(s => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                onConfirm={handleConfirm}
                onDismiss={handleDismiss}
                confirmed={confirmedIds.has(s.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Channel selector */}
      {showSelector && (
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-foreground">Selecionar canais para monitorar</h2>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar canal..."
            className="form-control" />
          {isLoading && <p className="text-sm text-fg4">Carregando canais...</p>}
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredAll.map(ch => (
              <label key={ch.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-background cursor-pointer">
                <input type="checkbox" checked={selectedIds.includes(ch.id)} onChange={() => toggle(ch.id)} className="rounded" />
                {ch.is_private ? <Lock className="w-3.5 h-3.5 text-fg4" /> : <Hash className="w-3.5 h-3.5 text-fg4" />}
                <span className="text-sm text-fg2">{ch.name}</span>
                {ch.num_members > 0 && <span className="text-xs text-fg4 ml-auto">{ch.num_members}</span>}
              </label>
            ))}
            {filteredAll.length === 0 && !isLoading && (
              <p className="text-sm text-fg4 text-center py-4">Nenhum canal encontrado.</p>
            )}
          </div>
          <p className="text-xs text-fg4">{selectedIds.length} canal{selectedIds.length !== 1 ? 'is' : ''} selecionado{selectedIds.length !== 1 ? 's' : ''}</p>
        </div>
      )}

      {/* Empty state */}
      {monitoredChannels.length === 0 && !showSelector && (
        <div className="text-center py-16 text-fg4">
          <Hash className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-muted-foreground">Nenhum canal monitorado</p>
          <p className="text-sm mt-1">Clique em "Gerenciar canais" para selecionar canais do Slack.</p>
          <button onClick={() => setShowSelector(true)}
            className="mt-4 px-4 py-2 text-white rounded-lg text-sm" style={{ backgroundColor: '#0089ac' }}>
            Selecionar canais
          </button>
        </div>
      )}

      {/* Channels */}
      <div className="space-y-3">
        {monitoredChannels.map(ch => (
          <ChannelAccordion key={ch.id} channel={ch} onMessages={handleMessages} />
        ))}
      </div>

      {/* Nova Reunião Modal */}
      <NovaReuniaoModal
        open={reuniaoModal.open}
        onClose={() => {
          if (reuniaoModal.suggestionId) markConfirmed(reuniaoModal.suggestionId)
          setReuniaoModal({ open: false })
        }}
        prefill={reuniaoModal.prefill}
      />

      {/* Novo Lead Modal (Slack) */}
      <NewLeadModal
        open={leadModal.open}
        prefill={leadModal.prefill}
        onClose={() => {
          if (leadModal.suggestionId) markConfirmed(leadModal.suggestionId)
          setLeadModal({ open: false })
        }}
      />
    </div>
  )
}
