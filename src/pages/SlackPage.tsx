import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Hash, Lock, RefreshCw, ChevronDown, Calendar, UserSearch, AlertCircle, ExternalLink, Settings } from 'lucide-react'
import {
  listChannels,
  getMessages,
  tsToDate,
  formatSlackText,
  classifyMessage,
  type SlackChannel,
  type SlackMessage,
} from '@/lib/slack'

const STORAGE_KEY = 'consej_slack_channels'

function Badge({ type }: { type: 'reuniao' | 'prospeccao' }) {
  if (type === 'reuniao')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        <Calendar className="w-3 h-3" /> Reunião
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      <UserSearch className="w-3 h-3" /> Prospecção
    </span>
  )
}

function MessageCard({ msg }: { msg: SlackMessage }) {
  const classification = classifyMessage(msg.text)
  const date = tsToDate(msg.ts)

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-800 whitespace-pre-wrap break-words">
            {formatSlackText(msg.text) || <span className="italic text-slate-400">[mensagem sem texto]</span>}
          </p>
          {msg.reply_count ? (
            <p className="text-xs text-slate-400 mt-1">{msg.reply_count} resposta{msg.reply_count > 1 ? 's' : ''}</p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {classification && <Badge type={classification} />}
          <span className="text-xs text-slate-400 whitespace-nowrap">
            {date.toLocaleDateString('pt-BR')} {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  )
}

function ChannelMessages({ channelId, channelName }: { channelId: string; channelName: string }) {
  const [filter, setFilter] = useState<'todos' | 'reuniao' | 'prospeccao'>('todos')

  const { data: messages, isLoading, error, refetch } = useQuery<SlackMessage[]>({
    queryKey: ['slack-messages', channelId],
    queryFn: () => getMessages(channelId, 50),
    staleTime: 1000 * 60 * 2,
    retry: false,
  })

  const filtered = (messages ?? []).filter((m) => {
    if (m.subtype) return false
    if (filter === 'todos') return true
    return classifyMessage(m.text) === filter
  })

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setFilter('todos')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === 'todos' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Todos
        </button>
        <button
          onClick={() => setFilter('reuniao')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === 'reuniao' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Reuniões
        </button>
        <button
          onClick={() => setFilter('prospeccao')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === 'prospeccao' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Prospecção
        </button>
        <button
          onClick={() => refetch()}
          className="ml-auto p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          title="Atualizar"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {isLoading && (
        <div className="text-center py-8 text-slate-400 text-sm">Carregando mensagens...</div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {(error as Error).message}
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="text-center py-8 text-slate-400 text-sm">
          Nenhuma mensagem encontrada.
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((msg) => (
          <MessageCard key={msg.ts} msg={msg} />
        ))}
      </div>
    </div>
  )
}

function ChannelAccordion({ channel }: { channel: SlackChannel }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 transition-colors text-left"
      >
        {channel.is_private ? (
          <Lock className="w-4 h-4 text-slate-400 shrink-0" />
        ) : (
          <Hash className="w-4 h-4 text-slate-400 shrink-0" />
        )}
        <span className="font-medium text-slate-800 flex-1">{channel.name}</span>
        {channel.num_members > 0 && (
          <span className="text-xs text-slate-400">{channel.num_members} membros</span>
        )}
        {channel.topic?.value && (
          <span className="text-xs text-slate-400 max-w-xs truncate hidden md:block">{channel.topic.value}</span>
        )}
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 bg-slate-50 border-t border-slate-100">
          <ChannelMessages channelId={channel.id} channelName={channel.name} />
        </div>
      )}
    </div>
  )
}

export function SlackPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
  })
  const [showSelector, setShowSelector] = useState(false)
  const [search, setSearch] = useState('')

  const { data: allChannels, isLoading, error } = useQuery<SlackChannel[]>({
    queryKey: ['slack-channels'],
    queryFn: listChannels,
    staleTime: 1000 * 60 * 10,
    retry: false,
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedIds))
  }, [selectedIds])

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }, [])

  const monitoredChannels = (allChannels ?? []).filter((c) => selectedIds.includes(c.id))
  const filteredAll = (allChannels ?? []).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const isNotConfigured =
    error && (error as Error).message?.includes('SLACK_BOT_TOKEN não configurado')

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Slack</h1>
          <p className="text-slate-500 text-sm mt-0.5">Andamentos de reuniões e prospecção</p>
        </div>
        <button
          onClick={() => setShowSelector((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Settings className="w-4 h-4" />
          Gerenciar canais
        </button>
      </div>

      {/* Token not configured warning */}
      {isNotConfigured && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-800">Slack não configurado</p>
              <p className="text-amber-700 mt-1">
                É necessário adicionar o <code className="bg-amber-100 px-1 rounded">SLACK_BOT_TOKEN</code> como secret no Supabase e publicar a Edge Function.
              </p>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-amber-700 underline hover:text-amber-900"
              >
                Abrir Supabase <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Channel selector */}
      {showSelector && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-slate-800">Selecionar canais para monitorar</h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar canal..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {isLoading && <p className="text-sm text-slate-400">Carregando canais...</p>}
          {!isLoading && !isNotConfigured && error && (
            <p className="text-sm text-red-500">{(error as Error).message}</p>
          )}
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredAll.map((ch) => (
              <label key={ch.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(ch.id)}
                  onChange={() => toggle(ch.id)}
                  className="rounded"
                />
                {ch.is_private ? <Lock className="w-3.5 h-3.5 text-slate-400" /> : <Hash className="w-3.5 h-3.5 text-slate-400" />}
                <span className="text-sm text-slate-700">{ch.name}</span>
                {ch.num_members > 0 && (
                  <span className="text-xs text-slate-400 ml-auto">{ch.num_members}</span>
                )}
              </label>
            ))}
            {filteredAll.length === 0 && !isLoading && (
              <p className="text-sm text-slate-400 text-center py-4">Nenhum canal encontrado.</p>
            )}
          </div>
          <p className="text-xs text-slate-400">
            {selectedIds.length} canal{selectedIds.length !== 1 ? 'is' : ''} selecionado{selectedIds.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Monitored channels */}
      {monitoredChannels.length === 0 && !showSelector && (
        <div className="text-center py-16 text-slate-400">
          <Hash className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-slate-500">Nenhum canal monitorado</p>
          <p className="text-sm mt-1">Clique em "Gerenciar canais" para selecionar os canais do Slack que deseja acompanhar.</p>
          <button
            onClick={() => setShowSelector(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            Selecionar canais
          </button>
        </div>
      )}

      <div className="space-y-3">
        {monitoredChannels.map((ch) => (
          <ChannelAccordion key={ch.id} channel={ch} />
        ))}
      </div>
    </div>
  )
}
