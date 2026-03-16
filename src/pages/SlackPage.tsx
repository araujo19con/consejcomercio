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
} from '@/lib/slack'
import { detectSuggestions, type Suggestion, type ReuniaoSuggestion, type LeadSuggestion, type OportunidadeSuggestion } from '@/lib/slack-suggestions'
import { NovaReuniaoModal } from '@/components/reunioes/NovaReuniaoModal'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const STORAGE_KEY = 'consej_slack_channels'
const CONFIRMED_KEY = 'consej_slack_confirmed'
const DISMISSED_KEY = 'consej_slack_dismissed'

function getSet(key: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(key) ?? '[]')) } catch { return new Set() }
}

// ─── Badges ────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: Suggestion['type'] }) {
  if (type === 'reuniao') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
      <Calendar className="w-3 h-3" />Reunião
    </span>
  )
  if (type === 'lead') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      <UserSearch className="w-3 h-3" />Novo Lead
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
      <TrendingUp className="w-3 h-3" />Oportunidade
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
    <div className={`bg-white rounded-xl p-4 space-y-2 border-2 ${confirmed ? 'border-green-200 opacity-75' : 'border-amber-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <TypeBadge type={suggestion.type} />
        <div className="flex items-center gap-1.5">
          {confirmed && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              <Check className="w-3 h-3" />Confirmado
            </span>
          )}
          <span className="text-xs text-slate-400">#{suggestion.channelName}</span>
        </div>
      </div>

      {suggestion.type === 'reuniao' && (
        <div>
          <p className="text-sm font-semibold text-slate-800">{(suggestion as ReuniaoSuggestion).titulo}</p>
          {(suggestion as ReuniaoSuggestion).dataHora && (
            <p className="text-xs text-slate-500">
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
        <div className="text-sm text-slate-600">
          {(suggestion as LeadSuggestion).email && <p>📧 {(suggestion as LeadSuggestion).email}</p>}
          {(suggestion as LeadSuggestion).telefone && <p>📱 {(suggestion as LeadSuggestion).telefone}</p>}
        </div>
      )}

      {suggestion.type === 'oportunidade' && (
        <div className="text-sm text-slate-600">
          <p className="text-xs text-slate-500 line-clamp-2">{(suggestion as OportunidadeSuggestion).descricao}</p>
          {(suggestion as OportunidadeSuggestion).valorEstimado && (
            <p className="text-xs font-medium text-green-700 mt-1">
              💰 R$ {(suggestion as OportunidadeSuggestion).valorEstimado!.toLocaleString('pt-BR')}
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-slate-400 italic line-clamp-2 border-l-2 border-slate-200 pl-2">
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-500 border border-slate-200 hover:bg-slate-50"
          >
            <X className="w-3 h-3" />Ignorar
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Message Card ────────────────────────────────────────────────────────────

function MessageBadge({ type }: { type: 'reuniao' | 'prospeccao' }) {
  if (type === 'reuniao') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
      <Calendar className="w-3 h-3" />Reunião
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      <UserSearch className="w-3 h-3" />Prospecção
    </span>
  )
}

function MessageCard({ msg }: { msg: SlackMessage }) {
  const classification = classifyMessage(msg.text)
  const date = tsToDate(msg.ts)
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-800 whitespace-pre-wrap break-words flex-1">
          {formatSlackText(msg.text) || <span className="italic text-slate-400">[mensagem sem texto]</span>}
        </p>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {classification && <MessageBadge type={classification} />}
          <span className="text-xs text-slate-400 whitespace-nowrap">
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
  const [filter, setFilter] = useState<'todos' | 'reuniao' | 'prospeccao'>('todos')

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

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-3">
        {(['todos', 'reuniao', 'prospeccao'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === f
                ? f === 'todos' ? 'bg-slate-800 text-white' : f === 'reuniao' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f === 'todos' ? 'Todos' : f === 'reuniao' ? 'Reuniões' : 'Prospecção'}
          </button>
        ))}
        <button onClick={() => refetch()} className="ml-auto p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
      {isLoading && <div className="text-center py-8 text-slate-400 text-sm">Carregando mensagens...</div>}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" />{(error as Error).message}
        </div>
      )}
      {!isLoading && !error && filtered.length === 0 && (
        <div className="text-center py-8 text-slate-400 text-sm">Nenhuma mensagem encontrada.</div>
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
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 transition-colors text-left">
        {channel.is_private ? <Lock className="w-4 h-4 text-slate-400 shrink-0" /> : <Hash className="w-4 h-4 text-slate-400 shrink-0" />}
        <span className="font-medium text-slate-800 flex-1">{channel.name}</span>
        {channel.num_members > 0 && <span className="text-xs text-slate-400">{channel.num_members} membros</span>}
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 bg-slate-50 border-t border-slate-100">
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
      try {
        await supabase.from('leads').insert([{
          nome: l.nome ?? 'Lead do Slack',
          email: l.email,
          telefone: l.telefone,
          origem: 'slack',
          status: 'novo',
          observacoes: `Detectado no canal #${l.channelName}\n\n"${l.rawText.slice(0, 300)}"`,
        }])
        toast.success('Lead criado com sucesso!')
        markConfirmed(suggestion.id)
      } catch { toast.error('Erro ao criar lead') }
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
          <h1 className="text-2xl font-bold text-slate-900">Slack</h1>
          <p className="text-slate-500 text-sm mt-0.5">Andamentos de reuniões e prospecção</p>
        </div>
        <button onClick={() => setShowSelector(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50">
          <Settings className="w-4 h-4" />Gerenciar canais
        </button>
      </div>

      {/* Token warning */}
      {isNotConfigured && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-800">Slack não configurado</p>
              <p className="text-amber-700 mt-1">Adicione <code className="bg-amber-100 px-1 rounded">SLACK_BOT_TOKEN</code> em Vercel → Settings → Environment Variables.</p>
              <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-amber-700 underline">
                Abrir Vercel <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions panel */}
      {allSuggestions.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <h2 className="font-semibold text-amber-900">
              {allSuggestions.filter(s => !confirmedIds.has(s.id)).length} sugestão
              {allSuggestions.filter(s => !confirmedIds.has(s.id)).length !== 1 ? 'ões' : ''} pendente
              {allSuggestions.filter(s => !confirmedIds.has(s.id)).length !== 1 ? 's' : ''}
              {allSuggestions.some(s => confirmedIds.has(s.id)) && (
                <span className="ml-2 text-green-700 font-normal text-sm">
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
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-slate-800">Selecionar canais para monitorar</h2>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar canal..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {isLoading && <p className="text-sm text-slate-400">Carregando canais...</p>}
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredAll.map(ch => (
              <label key={ch.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" checked={selectedIds.includes(ch.id)} onChange={() => toggle(ch.id)} className="rounded" />
                {ch.is_private ? <Lock className="w-3.5 h-3.5 text-slate-400" /> : <Hash className="w-3.5 h-3.5 text-slate-400" />}
                <span className="text-sm text-slate-700">{ch.name}</span>
                {ch.num_members > 0 && <span className="text-xs text-slate-400 ml-auto">{ch.num_members}</span>}
              </label>
            ))}
            {filteredAll.length === 0 && !isLoading && (
              <p className="text-sm text-slate-400 text-center py-4">Nenhum canal encontrado.</p>
            )}
          </div>
          <p className="text-xs text-slate-400">{selectedIds.length} canal{selectedIds.length !== 1 ? 'is' : ''} selecionado{selectedIds.length !== 1 ? 's' : ''}</p>
        </div>
      )}

      {/* Empty state */}
      {monitoredChannels.length === 0 && !showSelector && (
        <div className="text-center py-16 text-slate-400">
          <Hash className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-slate-500">Nenhum canal monitorado</p>
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
    </div>
  )
}
