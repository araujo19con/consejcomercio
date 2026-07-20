// Tipos do payload que o Supabase Database Webhook envia.
// Docs: https://supabase.com/docs/guides/database/webhooks

export interface LeadRow {
  id: string
  nome: string
  empresa: string
  segmento: string
  telefone: string
  email: string | null
  origem: string
  status: string
  estado: string | null
  data_diagnostico: string | null
  servicos_interesse: string[] | null
  investimento_estimado: string | null
  responsavel: string | null
  responsavel_id: string | null
  fechado_por_id: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: LeadRow | null
  old_record: LeadRow | null
}

export interface HydratedLead extends LeadRow {
  closer_nome: string | null
  closer_email: string | null
  prospector_nome: string | null
  cliente_id: string | null
  contrato_tipo: string | null
  contrato_modelo_precificacao: string | null
  contrato_valor_total: number | null
  contrato_valor_mensal: number | null
  diagnostico_cluster: string | null
  dossie_dores_expectativas: string | null
  dossie_perfil_comunicacao: string | null
  dossie_info_financeira: string | null
  dossie_prazos_marcos: string | null
}
