import type { SlackMessage } from './slack'

export type SuggestionType = 'reuniao' | 'lead' | 'oportunidade'

export interface BaseSuggestion {
  id: string // `${channelId}-${msg.ts}`
  type: SuggestionType
  message: SlackMessage
  channelId: string
  channelName: string
  rawText: string
}

export interface ReuniaoSuggestion extends BaseSuggestion {
  type: 'reuniao'
  titulo: string
  dataHora?: Date
  local?: string
  link?: string
}

export interface LeadSuggestion extends BaseSuggestion {
  type: 'lead'
  nome?: string
  empresa?: string
  telefone?: string
  email?: string
}

export interface OportunidadeSuggestion extends BaseSuggestion {
  type: 'oportunidade'
  descricao: string
  valorEstimado?: number
}

export type Suggestion = ReuniaoSuggestion | LeadSuggestion | OportunidadeSuggestion

// ─── Patterns ────────────────────────────────────────────────────────────────

const REUNIAO_KEYWORDS = /\b(reunião|reuniao|meeting|call|ligação|ligacao|videoconferência|zoom|meet\.google|teams|hangout|calendly|às \d{1,2}h|às \d{1,2}:\d{2})\b/i
const DATE_PATTERNS = [
  /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/,           // 20/03, 20-03-2026
  /\b(amanhã|hoje|segunda|terça|quarta|quinta|sexta|sábado|domingo)\b/i,
  /\b(próxima?\s+(?:segunda|terça|quarta|quinta|sexta|semana))\b/i,
]
const TIME_PATTERN = /\b(\d{1,2})h(\d{2})?|\b(\d{1,2}):(\d{2})\b/i
const LINK_PATTERN = /https?:\/\/[^\s]+(?:zoom|meet\.google|teams|calendly)[^\s]*/i

const LEAD_KEYWORDS = /\b(novo contato|novo lead|novo cliente|indicação|indicacao|conheci|prospecção|prospectei|interessado em|quer contratar|procurando advogado|precisa de assessoria|me indicaram|ele quer|ela quer)\b/i
const PHONE_PATTERN = /(?:\+55\s?)?(?:\(?\d{2}\)?\s?)(?:9\s?)?\d{4}[-.\s]?\d{4}/
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/

const OPORTUNIDADE_KEYWORDS = /\b(proposta|fechar contrato|assinar|orçamento|orcamento|negociação|negociando|valor de r\$|honorários|honorarios|fechamento|pipeline)\b/i
const VALOR_PATTERN = /R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/i

// ─── Parsers ─────────────────────────────────────────────────────────────────

function parseDateTime(text: string): Date | undefined {
  const now = new Date()
  const timeMatch = text.match(TIME_PATTERN)
  const hour = timeMatch ? parseInt(timeMatch[1] ?? timeMatch[3]) : undefined
  const minute = timeMatch ? parseInt(timeMatch[2] ?? timeMatch[4] ?? '0') : 0

  const dmyMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/)
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1])
    const m = parseInt(dmyMatch[2]) - 1
    const y = dmyMatch[3] ? parseInt(dmyMatch[3].length === 2 ? `20${dmyMatch[3]}` : dmyMatch[3]) : now.getFullYear()
    const dt = new Date(y, m, d, hour ?? 9, minute)
    if (!isNaN(dt.getTime())) return dt
  }

  const lowerText = text.toLowerCase()
  if (lowerText.includes('amanhã') || lowerText.includes('amanha')) {
    const dt = new Date(now)
    dt.setDate(now.getDate() + 1)
    dt.setHours(hour ?? 9, minute, 0, 0)
    return dt
  }
  if (lowerText.includes('hoje')) {
    const dt = new Date(now)
    dt.setHours(hour ?? 9, minute, 0, 0)
    return dt
  }

  const weekdays: Record<string, number> = { segunda: 1, terça: 2, terca: 2, quarta: 3, quinta: 4, sexta: 5, sábado: 6, sabado: 6, domingo: 0 }
  for (const [name, wd] of Object.entries(weekdays)) {
    if (lowerText.includes(name)) {
      const dt = new Date(now)
      const diff = (wd - now.getDay() + 7) % 7 || 7
      dt.setDate(now.getDate() + diff)
      dt.setHours(hour ?? 9, minute, 0, 0)
      return dt
    }
  }

  return undefined
}

function extractTitle(text: string): string {
  const clean = text.replace(LINK_PATTERN, '').replace(/\s+/g, ' ').trim()
  const sentences = clean.split(/[.!?\n]/)
  const relevant = sentences.find((s) => REUNIAO_KEYWORDS.test(s)) ?? sentences[0]
  return relevant.trim().slice(0, 80) || 'Reunião detectada'
}

// ─── Main detector ────────────────────────────────────────────────────────────

export function detectSuggestions(
  messages: SlackMessage[],
  channelId: string,
  channelName: string,
  confirmedIds: Set<string>,
  dismissedIds: Set<string>
): Suggestion[] {
  const suggestions: Suggestion[] = []

  for (const msg of messages) {
    if (msg.subtype) continue
    const text = msg.text ?? ''
    if (!text.trim()) continue

    const id = `${channelId}-${msg.ts}`
    if (confirmedIds.has(id) || dismissedIds.has(id)) continue

    const base: BaseSuggestion = { id, type: 'reuniao', message: msg, channelId, channelName, rawText: text }

    // Detecção de reunião
    if (REUNIAO_KEYWORDS.test(text) && DATE_PATTERNS.some((p) => p.test(text))) {
      const linkMatch = text.match(LINK_PATTERN)
      suggestions.push({
        ...base,
        type: 'reuniao',
        titulo: extractTitle(text),
        dataHora: parseDateTime(text),
        local: linkMatch ? undefined : text.match(/\b(sala|escritório|escritorio|online|presencial)\b/i)?.[0],
        link: linkMatch?.[0],
      } as ReuniaoSuggestion)
      continue
    }

    // Detecção de lead
    if (LEAD_KEYWORDS.test(text)) {
      const phoneMatch = text.match(PHONE_PATTERN)
      const emailMatch = text.match(EMAIL_PATTERN)
      suggestions.push({
        ...base,
        type: 'lead',
        email: emailMatch?.[0],
        telefone: phoneMatch?.[0],
      } as LeadSuggestion)
      continue
    }

    // Detecção de oportunidade
    if (OPORTUNIDADE_KEYWORDS.test(text)) {
      const valorMatch = text.match(VALOR_PATTERN)
      let valorEstimado: number | undefined
      if (valorMatch) {
        valorEstimado = parseFloat(valorMatch[1].replace(/\./g, '').replace(',', '.'))
      }
      suggestions.push({
        ...base,
        type: 'oportunidade',
        descricao: text.slice(0, 120),
        valorEstimado,
      } as OportunidadeSuggestion)
    }
  }

  return suggestions
}
