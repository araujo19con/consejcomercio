// Cadência CONSEJ: Dias 1, 3, 5, 7, 10 após a primeira interação.
// Cada ponto da cadência tem um stage de mensagem associado.

import type { Stage } from '@/pages/MensagensPage'
import type { InteracaoLead, Lead } from '@/types'
import { TERMINAL_STAGES } from './constants'

export interface CadenciaPoint {
  dia: number
  stage: Stage
  label: string
  descricao: string
}

export const CADENCIA_DIAS: CadenciaPoint[] = [
  { dia: 1,  stage: 'primeiro_contato', label: 'Dia 1',  descricao: 'Primeiro contato' },
  { dia: 3,  stage: 'followup',         label: 'Dia 3',  descricao: 'Reforço' },
  { dia: 5,  stage: 'followup',         label: 'Dia 5',  descricao: 'Educativo' },
  { dia: 7,  stage: 'followup',         label: 'Dia 7',  descricao: 'Descontraído' },
  { dia: 10, stage: 'followup',         label: 'Dia 10', descricao: 'Encerramento' },
]

// Tolerância em dias (±) para considerar uma cadência "devida hoje".
export const CADENCIA_TOLERANCIA = 0

function daysBetween(from: Date, to: Date): number {
  const MS = 1000 * 60 * 60 * 24
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime()
  return Math.round((b - a) / MS)
}

/**
 * Retorna o ponto da cadência que está "devido hoje" para o lead, ou null.
 *
 * Lógica:
 *  - Se o lead está em estágio terminal (ganho/perdido/cancelado), retorna null.
 *  - Se o lead nunca recebeu interação: ponto do Dia 1 se o lead foi criado hoje ou ontem.
 *  - Caso contrário: conta dias desde a ÚLTIMA interação e bate contra o mapa.
 *    Retorna o ponto cujo `dia` corresponde exatamente ao nº de dias desde a última msg.
 */
export function getCadenciaDueToday(
  lead: Pick<Lead, 'id' | 'status' | 'created_at'>,
  interacoesDoLead: InteracaoLead[],
  today: Date = new Date(),
): CadenciaPoint | null {
  if ((TERMINAL_STAGES as readonly string[]).includes(lead.status)) return null

  const ultima = interacoesDoLead[0]  // lista já vem ordenada desc por enviada_em

  if (!ultima) {
    const diasDesdeCriacao = daysBetween(new Date(lead.created_at), today)
    if (diasDesdeCriacao === 0 || diasDesdeCriacao === 1) {
      return CADENCIA_DIAS[0]  // Dia 1 — primeiro contato
    }
    return null
  }

  const diasDesdeUltima = daysBetween(new Date(ultima.enviada_em), today)
  // Buscar o ponto exato
  const match = CADENCIA_DIAS.find(p => p.dia === diasDesdeUltima)
  return match ?? null
}

/**
 * Para um lead sem interações, retorna quantos dias desde a criação.
 * Para um lead com interações, retorna dias desde a última.
 */
export function daysSinceLastTouch(
  lead: Pick<Lead, 'created_at'>,
  interacoesDoLead: InteracaoLead[],
  today: Date = new Date(),
): number {
  const ref = interacoesDoLead[0]
    ? new Date(interacoesDoLead[0].enviada_em)
    : new Date(lead.created_at)
  return daysBetween(ref, today)
}
