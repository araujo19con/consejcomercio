export interface Lead {
  id: string
  nome: string
  empresa: string
  segmento: string
  telefone: string
  email?: string | null
  origem: string
  status: string
  data_diagnostico?: string | null
  motivo_perda?: string | null
  servicos_interesse?: string[]
  investimento_estimado?: string | null
  responsavel?: string | null
  responsavel_id?: string | null
  referido_por_cliente_id?: string | null
  referido_por_parceiro_id?: string | null
  notas?: string | null
  created_at: string
  updated_at: string
  diagnostico?: Diagnostico | null
}

export interface DiagnosticAnswers {
  civil_q1?: string
  civil_q2?: string
  civil_q3?: string
  empresarial_q1?: string
  empresarial_q2?: string
  contratual_q1?: string
  contratual_q2?: string
  contratual_q3?: string
  digital_q1?: string
  trabalhista_q1?: string
  trabalhista_q2?: string
  pi_q1?: string
  investimento_q1?: string
}

export interface Diagnostico extends DiagnosticAnswers {
  id: string
  lead_id: string
  cluster_recomendado?: string | null
  servicos_urgentes?: string[]
  completed_at?: string | null
  created_at: string
  updated_at: string
}

export interface Cliente {
  id: string
  lead_id?: string | null
  nome: string
  empresa: string
  segmento: string
  telefone?: string | null
  email?: string | null
  status: string
  notas?: string | null
  created_at: string
  updated_at: string
  contratos?: Contrato[]
}

export interface Contrato {
  id: string
  cliente_id: string
  tipo: string
  modelo_precificacao: string
  areas_direito: string[]
  valor_total?: number | null
  valor_mensal?: number | null
  data_inicio?: string | null
  data_fim?: string | null
  status: string
  rm_status: string
  notas?: string | null
  responsavel_id?: string | null
  created_at: string
  updated_at: string
  cliente?: Cliente
}

export interface Demanda {
  id: string
  contrato_id: string
  cliente_id: string
  titulo: string
  descricao?: string | null
  tipo: string
  valor?: number | null
  status: string
  area_direito?: string | null
  data_abertura: string
  data_conclusao?: string | null
  responsavel?: string | null
  created_at: string
  updated_at: string
  contrato?: Contrato
  cliente?: Cliente
}

export interface Parceiro {
  id: string
  nome: string
  tipo: string
  contato_nome?: string | null
  contato_email?: string | null
  contato_phone?: string | null
  website?: string | null
  status: string
  notas?: string | null
  created_at: string
  updated_at: string
}

export interface Indicacao {
  id: string
  indicante_cliente_id?: string | null
  indicante_parceiro_id?: string | null
  indicado_nome: string
  indicado_telefone: string
  indicado_empresa?: string | null
  indicado_email?: string | null
  lead_id?: string | null
  status: string
  tipo_recompensa?: string | null
  recompensa_descricao?: string | null
  recompensa_entregue: boolean
  data_recompensa?: string | null
  notas?: string | null
  created_at: string
  updated_at: string
  indicante_cliente?: Cliente | null
  indicante_parceiro?: Parceiro | null
  lead?: Lead | null
}

export interface Oportunidade {
  id: string
  cliente_id: string
  contrato_id?: string | null
  tipo: string
  servico_alvo: string
  titulo: string
  descricao?: string | null
  status: string
  valor_estimado?: number | null
  data_alerta?: string | null
  responsavel?: string | null
  created_at: string
  updated_at: string
  cliente?: Cliente
}

export interface AuditLog {
  id: string
  tabela: string
  registro_id: string
  acao: string
  campo?: string | null
  valor_antes?: Record<string, unknown> | null
  valor_depois?: Record<string, unknown> | null
  usuario?: string | null
  created_at: string
}
