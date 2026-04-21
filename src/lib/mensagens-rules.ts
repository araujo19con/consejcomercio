// Regras de avanço de status do pipeline quando uma mensagem é enviada.
// (status_atual, stage_msg) → status sugerido
//
// Um mapa vazio ou chave ausente significa "não sugerir avanço".

import type { Stage } from '@/pages/MensagensPage'

export const STATUS_AFTER_SEND: Record<string, Partial<Record<Stage, string>>> = {
  classificacao: {
    primeiro_contato: 'levantamento_oportunidade',
    diagnostico: 'levantamento_oportunidade',
  },
  levantamento_oportunidade: {
    followup: 'educar_lead',
    proposta: 'proposta_comercial',
  },
  educar_lead: {
    proposta: 'proposta_comercial',
  },
  proposta_comercial: {
    negociacao: 'negociacao',
  },
  stand_by: {
    reativacao: 'classificacao',
    followup: 'classificacao',
  },
}

export function getSuggestedStatus(
  currentStatus: string | null | undefined,
  stageMsg: Stage,
): string | null {
  if (!currentStatus) return null
  const rule = STATUS_AFTER_SEND[currentStatus]
  if (!rule) return null
  return rule[stageMsg] ?? null
}
