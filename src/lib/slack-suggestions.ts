import type { SlackMessage } from './slack'

export type SuggestionType = 'reuniao' | 'lead' | 'oportunidade' | 'indicacao'

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
  notas?: string
}

export interface OportunidadeSuggestion extends BaseSuggestion {
  type: 'oportunidade'
  descricao: string
  valorEstimado?: number
}

export interface IndicacaoSuggestion extends BaseSuggestion {
  type: 'indicacao'
  indicadoNome?: string
  indicadoTelefone?: string
  indicadoEmail?: string
}

export type Suggestion = ReuniaoSuggestion | LeadSuggestion | OportunidadeSuggestion | IndicacaoSuggestion

// ─── Patterns ────────────────────────────────────────────────────────────────

const REUNIAO_KEYWORDS = /\b(reunião|reuniao|meeting|call|ligação|ligacao|videoconferência|zoom|meet\.google|teams|hangout|calendly|às \d{1,2}h|às \d{1,2}:\d{2})\b/i
const DATE_PATTERNS = [
  /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/,
  /\b(amanhã|hoje|segunda|terça|quarta|quinta|sexta|sábado|domingo)\b/i,
  /\b(próxima?\s+(?:segunda|terça|quarta|quinta|sexta|semana))\b/i,
]
const TIME_PATTERN = /\b(\d{1,2})h(\d{2})?|\b(\d{1,2}):(\d{2})\b/i
const LINK_PATTERN = /https?:\/\/[^\s]+(?:zoom|meet\.google|teams|calendly)[^\s]*/i

const INDICACAO_KEYWORDS = /\b(indicou|foi indicado|veio por indicação|indicação de|indicou o|indicou a|recomendou|trouxe um contato|me mandou contato|indicou para nós|indicado pelo|indicada pela)\b/i

const LEAD_KEYWORDS = /\b(
  novo contato|novo lead|novo cliente|conheci|prospecção|prospectei|
  interessado em|quer contratar|quer fazer (um|uma)|quer nossos serviços|
  procurando advogado|precisa de (advogado|assessoria|consultoria)|
  busca(ndo)? (advogado|assessoria|consultoria)|
  potencial cliente|primeira consulta|diagnóstico gratuito|
  me indicaram|ele quer contratar|ela quer contratar|
  entrou em contato|entrou contato|fez contato|
  assumir o contato|assumir o lead|assumir esse contato|
  contato com o lead|quem (pode|vai|fica) (com|assumir)|
  registro de marca|propriedade intelectual|
  processo (trabalhista|civil|criminal|judicial)|
  inventário|divórcio|contrato social|ltda|mei|
  assessoria jurídica|consultoria jurídica|
  me passou o contato|passou o contato|mandou contato|
  para fazer (um|uma)|para contratar|para solicitar|
  cliente em potencial|potencial negócio|
  entrar em contato|pode atender|pode assumir
)\b/xi
const PHONE_PATTERN = /(?:\+55\s?)?(?:\(?\d{2}\)?\s?)(?:9\s?)?\d{4}[-.\s]?\d{4}/
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/

// Extrai nome próprio: "representante X", "contato X", "(o|a) X entrou|X de"
const NOME_PATTERNS = [
  /representante\s+([A-ZÁÉÍÓÚÂÊÔÀÃÕÇ][a-záéíóúâêôàãõç]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÀÃÕÇ][a-záéíóúâêôàãõç]+)?)/,
  /contato\s+([A-ZÁÉÍÓÚÂÊÔÀÃÕÇ][a-záéíóúâêôàãõç]+)/,
  /(?:o|a)\s+([A-ZÁÉÍÓÚÂÊÔÀÃÕÇ][a-záéíóúâêôàãõç]+)\s+(?:entrou|fez|quer|precisa|está)/,
]
// Extrai empresa: "empresa chamada X", "empresa X", "da empresa X", "da X"
const EMPRESA_PATTERNS = [
  /empresa\s+chamada\s+([A-ZÁÉÍÓÚÂÊÔÀÃÕÇ][A-Za-záéíóúâêôàãõç\s&]+?)(?:\s+entrou|\s+fez|\s+quer|[.,!?]|$)/,
  /empresa\s+([A-ZÁÉÍÓÚÂÊÔÀÃÕÇ][A-Za-záéíóúâêôàãõç\s&]+?)(?:\s+entrou|\s+fez|\s+quer|[.,!?]|$)/,
  /da\s+([A-ZÁÉÍÓÚÂÊÔÀÃÕÇ][A-Za-záéíóúâêôàãõç\s&]+?)\s+entrou/,
]

function extractNome(text: string): string | undefined {
  for (const p of NOME_PATTERNS) {
    const m = text.match(p)
    if (m?.[1]) return m[1].trim()
  }
  return undefined
}

function extractEmpresa(text: string): string | undefined {
  for (const p of EMPRESA_PATTERNS) {
    const m = text.match(p)
    if (m?.[1]) return m[1].trim()
  }
  return undefined
}

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

/** Normaliza data para chave de deduplicação (dia + hora arredondada) */
function dateKey(dt: Date | undefined): string {
  if (!dt) return ''
  return `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}-${dt.getHours()}`
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

  // Chaves de deduplicação por tipo
  const seenReuniaoKeys = new Set<string>() // data-hora
  const seenEmails = new Set<string>()
  const seenPhones = new Set<string>()
  const seenOportunidades = new Set<string>() // primeiras palavras da descrição

  for (const msg of messages) {
    if (msg.subtype) continue
    const text = msg.text ?? ''
    if (!text.trim()) continue

    const id = `${channelId}-${msg.ts}`

    // Sugestões descartadas ficam ocultas; confirmadas ficam visíveis (gerenciado no SlackPage)
    if (dismissedIds.has(id)) continue

    const base: BaseSuggestion = { id, type: 'reuniao', message: msg, channelId, channelName, rawText: text }

    // ── Reunião ──
    if (REUNIAO_KEYWORDS.test(text) && DATE_PATTERNS.some((p) => p.test(text))) {
      const dataHora = parseDateTime(text)
      const key = dateKey(dataHora) || text.slice(0, 40)
      if (seenReuniaoKeys.has(key)) continue
      seenReuniaoKeys.add(key)

      const linkMatch = text.match(LINK_PATTERN)
      suggestions.push({
        ...base,
        type: 'reuniao',
        titulo: extractTitle(text),
        dataHora,
        local: linkMatch ? undefined : text.match(/\b(sala|escritório|escritorio|online|presencial)\b/i)?.[0],
        link: linkMatch?.[0],
      } as ReuniaoSuggestion)
      continue
    }

    // ── Indicação ──
    if (INDICACAO_KEYWORDS.test(text)) {
      const phoneMatch = text.match(PHONE_PATTERN)
      const emailMatch = text.match(EMAIL_PATTERN)
      const phone = phoneMatch?.[0]
      const email = emailMatch?.[0]
      const textKey = `ind-${text.slice(0, 60)}`
      if (seenEmails.has(textKey)) continue
      seenEmails.add(textKey)

      suggestions.push({
        ...base,
        type: 'indicacao',
        indicadoTelefone: phone,
        indicadoEmail: email,
      } as IndicacaoSuggestion)
      continue
    }

    // ── Lead ──
    // Detecta se é lead: keyword match OU (telefone + contexto de pessoa/serviço)
    const phoneMatch = text.match(PHONE_PATTERN)
    const emailMatch = text.match(EMAIL_PATTERN)
    const phone = phoneMatch?.[0]
    const email = emailMatch?.[0]
    const hasContactInfo = !!(phone || email)
    const isLead = LEAD_KEYWORDS.test(text) || (hasContactInfo && /\b(número|contato|empresa|representante|cliente|atender|assumir|assessoria|marca|processo|contratar|serviço)\b/i.test(text))

    if (isLead) {
      // Deduplica por email ou telefone
      if (email && seenEmails.has(email)) continue
      if (phone && seenPhones.has(phone)) continue
      // Se não tem email nem telefone, deduplica por trecho do texto
      const textKey = text.slice(0, 60)
      if (!email && !phone && seenEmails.has(textKey)) continue

      if (email) seenEmails.add(email)
      if (phone) seenPhones.add(phone)
      if (!email && !phone) seenEmails.add(textKey)

      const nome = extractNome(text)
      const empresa = extractEmpresa(text)

      suggestions.push({
        ...base,
        type: 'lead',
        nome,
        empresa,
        email,
        telefone: phone,
        notas: `Detectado no canal #${channelName}\n\n"${text.slice(0, 400)}"`,
      } as LeadSuggestion)
      continue
    }

    // ── Oportunidade ──
    if (OPORTUNIDADE_KEYWORDS.test(text)) {
      const descKey = text.slice(0, 50)
      if (seenOportunidades.has(descKey)) continue
      seenOportunidades.add(descKey)

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
