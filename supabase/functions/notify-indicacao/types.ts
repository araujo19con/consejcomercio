// Tipos compartilhados entre index.ts e slack.ts

export interface IndicacaoRow {
  id: string
  indicante_cliente_id: string | null
  indicante_parceiro_id: string | null
  indicado_nome: string
  indicado_telefone: string
  indicado_empresa: string | null
  indicado_email: string | null
  lead_id: string | null
  status: string
  tipo_recompensa: string | null
  recompensa_descricao: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: IndicacaoRow | null
  old_record: IndicacaoRow | null
}

export interface HydratedIndicacao extends IndicacaoRow {
  indicante_tipo: 'cliente' | 'parceiro' | 'desconhecida'
  indicante_nome: string | null
  indicante_email: string | null
  indicante_empresa: string | null
  indicante_telefone: string | null
  // Para indicação via portal: dados do perfil portal correspondente
  portal_perfil_nome: string | null
  portal_tokens_creditados: number | null
  // Segmento extraído de notas (formato "Segmento: X")
  segmento: string | null
}
