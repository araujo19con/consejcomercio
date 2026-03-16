import { supabase } from './supabase'

export interface SlackChannel {
  id: string
  name: string
  is_private: boolean
  num_members: number
  topic?: { value: string }
}

export interface SlackMessage {
  ts: string
  user: string
  text: string
  reactions?: { name: string; count: number }[]
  reply_count?: number
  subtype?: string
}

async function callProxy(body: object) {
  const { data, error } = await supabase.functions.invoke('slack-proxy', { body })
  if (error) throw new Error(error.message)
  if (!data.ok) throw new Error(data.error ?? 'Erro desconhecido do Slack')
  return data
}

export async function listChannels(): Promise<SlackChannel[]> {
  const data = await callProxy({ action: 'list_channels' })
  return (data.channels ?? []) as SlackChannel[]
}

export async function getMessages(channel: string, limit = 30): Promise<SlackMessage[]> {
  const data = await callProxy({ action: 'get_messages', channel, limit })
  return (data.messages ?? []) as SlackMessage[]
}

export async function getUserName(userId: string): Promise<string> {
  try {
    const data = await callProxy({ action: 'get_user', channel: userId })
    return data.user?.real_name ?? data.user?.name ?? userId
  } catch {
    return userId
  }
}

export function tsToDate(ts: string): Date {
  return new Date(parseFloat(ts) * 1000)
}

export function formatSlackText(text: string): string {
  return text
    .replace(/<@[A-Z0-9]+>/g, '@usuário')
    .replace(/<#[A-Z0-9]+\|([^>]+)>/g, '#$1')
    .replace(/<([^|>]+)\|([^>]+)>/g, '$2')
    .replace(/<([^>]+)>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

// Palavras-chave para destacar mensagens relevantes
const KEYWORDS_REUNIAO = ['reunião', 'reuniao', 'meeting', 'call', 'ligação', 'ligacao', 'agendado', 'confirmado', 'remarcado']
const KEYWORDS_PROSPECCAO = ['lead', 'prospect', 'proposta', 'followup', 'follow-up', 'follow up', 'enviado', 'interessado', 'contato', 'cliente']

export function classifyMessage(text: string): 'reuniao' | 'prospeccao' | null {
  const lower = text.toLowerCase()
  if (KEYWORDS_REUNIAO.some((k) => lower.includes(k))) return 'reuniao'
  if (KEYWORDS_PROSPECCAO.some((k) => lower.includes(k))) return 'prospeccao'
  return null
}
