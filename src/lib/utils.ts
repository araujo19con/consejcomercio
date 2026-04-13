import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { differenceInDays, format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR })
}

export function formatRelative(date: string | Date | null | undefined): string {
  if (!date) return '—'
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR })
}

export function getContractProgress(dataInicio: string | null | undefined, dataFim: string | null | undefined): number {
  if (!dataInicio || !dataFim) return 0
  const start = new Date(dataInicio)
  const end = new Date(dataFim)
  const now = new Date()
  const total = differenceInDays(end, start)
  const elapsed = differenceInDays(now, start)
  if (total <= 0) return 100
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
}

export function getDaysUntilExpiry(dataFim: string | null | undefined): number | null {
  if (!dataFim) return null
  return differenceInDays(new Date(dataFim), new Date())
}

const DDD_TO_UF: Record<string, string> = {
  '11':'SP','12':'SP','13':'SP','14':'SP','15':'SP','16':'SP','17':'SP','18':'SP','19':'SP',
  '21':'RJ','22':'RJ','24':'RJ',
  '27':'ES','28':'ES',
  '31':'MG','32':'MG','33':'MG','34':'MG','35':'MG','37':'MG','38':'MG',
  '41':'PR','42':'PR','43':'PR','44':'PR','45':'PR','46':'PR',
  '47':'SC','48':'SC','49':'SC',
  '51':'RS','53':'RS','54':'RS','55':'RS',
  '61':'DF',
  '62':'GO','64':'GO',
  '63':'TO',
  '65':'MT','66':'MT',
  '67':'MS',
  '68':'AC',
  '69':'RO',
  '71':'BA','73':'BA','74':'BA','75':'BA','77':'BA',
  '79':'SE',
  '81':'PE','87':'PE',
  '82':'AL',
  '83':'PB',
  '84':'RN',
  '85':'CE','88':'CE',
  '86':'PI','89':'PI',
  '91':'PA','93':'PA','94':'PA',
  '92':'AM','97':'AM',
  '95':'RR',
  '96':'AP',
  '98':'MA','99':'MA',
}

export function getUFFromPhone(phone: string): string | null {
  // Strip everything except digits
  const digits = phone.replace(/\D/g, '')
  // Formats: +5584..., 5584..., (84)..., 84...
  let ddd = ''
  if (digits.startsWith('55') && digits.length >= 4) ddd = digits.slice(2, 4)
  else if (digits.length >= 2) ddd = digits.slice(0, 2)
  return DDD_TO_UF[ddd] ?? null
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}
