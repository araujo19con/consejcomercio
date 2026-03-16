// Pipeline stages — passive intake only (no active prospecting)
export const PIPELINE_STAGES = [
  { id: 'novo_lead', label: 'Novo Lead', color: 'slate' },
  { id: 'diagnostico_agendado', label: 'Diagnóstico Agendado', color: 'violet' },
  { id: 'diagnostico_realizado', label: 'Diagnóstico Realizado', color: 'blue' },
  { id: 'proposta_enviada', label: 'Proposta Enviada', color: 'amber' },
  { id: 'em_negociacao', label: 'Em Negociação', color: 'orange' },
  { id: 'contrato_assinado', label: 'Contrato Assinado', color: 'green' },
  { id: 'perdido', label: 'Perdido', color: 'red' },
] as const

export type PipelineStageId = typeof PIPELINE_STAGES[number]['id']

export const STAGE_COLORS: Record<string, string> = {
  novo_lead: 'bg-slate-100 text-slate-700 border-slate-200',
  diagnostico_agendado: 'bg-violet-100 text-violet-700 border-violet-200',
  diagnostico_realizado: 'bg-blue-100 text-blue-700 border-blue-200',
  proposta_enviada: 'bg-amber-100 text-amber-700 border-amber-200',
  em_negociacao: 'bg-orange-100 text-orange-700 border-orange-200',
  contrato_assinado: 'bg-green-100 text-green-700 border-green-200',
  perdido: 'bg-red-100 text-red-700 border-red-200',
}

export const STAGE_BORDER_COLORS: Record<string, string> = {
  novo_lead: 'border-l-slate-400',
  diagnostico_agendado: 'border-l-violet-500',
  diagnostico_realizado: 'border-l-blue-500',
  proposta_enviada: 'border-l-amber-500',
  em_negociacao: 'border-l-orange-500',
  contrato_assinado: 'border-l-green-500',
  perdido: 'border-l-red-500',
}

// Lead origins — passive only
export const LEAD_SOURCES = [
  { value: 'indicacao_cliente', label: 'Indicação de Cliente' },
  { value: 'indicacao_parceiro', label: 'Indicação de Parceiro' },
  { value: 'evento', label: 'Evento / Workshop' },
  { value: 'redes_sociais', label: 'Redes Sociais (orgânico)' },
  { value: 'site', label: 'Site (inbound)' },
  { value: 'mej', label: 'Rede MEJ' },
  { value: 'outro', label: 'Outro' },
]

export const LEAD_SOURCE_LABELS: Record<string, string> = {
  indicacao_cliente: 'Indicação de Cliente',
  indicacao_parceiro: 'Indicação de Parceiro',
  evento: 'Evento',
  redes_sociais: 'Redes Sociais',
  site: 'Site',
  mej: 'MEJ',
  outro: 'Outro',
}

// Client segments
export const SEGMENTS = [
  { value: 'empresa_junior', label: 'Empresa Júnior (MEJ)' },
  { value: 'empresa_senior', label: 'Empresa Sênior' },
  { value: 'startup', label: 'Startup' },
  { value: 'escritorio_arquitetura', label: 'Escritório de Arquitetura' },
  { value: 'empresa_design', label: 'Empresa de Design' },
  { value: 'empresa_gestao', label: 'Empresa de Gestão / Compliance' },
  { value: 'outro', label: 'Outro' },
]

// Service areas
export const SERVICE_AREAS = [
  { value: 'civil', label: 'Direito Civil' },
  { value: 'empresarial', label: 'Direito Empresarial' },
  { value: 'contratos', label: 'Direito Contratual' },
  { value: 'digital', label: 'Direito Digital / LGPD' },
  { value: 'trabalhista', label: 'Direito Trabalhista' },
  { value: 'propriedade_intelectual', label: 'Propriedade Intelectual / RM' },
  { value: 'estatuto', label: 'Revisão Estatutária' },
  { value: 'gestao_contratual', label: 'Gestão Contratual' },
]

// Pricing models
export const PRICING_MODELS = [
  { value: 'assessoria_6m', label: 'Assessoria 6 meses' },
  { value: 'assessoria_8m', label: 'Assessoria 8 meses' },
  { value: 'assessoria_12m', label: 'Assessoria 12 meses' },
  { value: 'consultoria_pontual', label: 'Consultoria Pontual' },
  { value: 'resgate', label: 'Assessoria por Resgate' },
]

// Contract types
export const CONTRACT_TYPES = [
  { value: 'assessoria', label: 'Assessoria Jurídica' },
  { value: 'consultoria', label: 'Consultoria Jurídica' },
  { value: 'resgate', label: 'Assessoria por Resgate' },
]

// Demanda types with auto-prices
export const DEMANDA_TIPOS = [
  { value: 'simples', label: 'Simples', valor: 200 },
  { value: 'complexa', label: 'Complexa', valor: 500 },
]

// Partner types (IPP — Perfil Ideal dos Parceiros)
export const PARCEIRO_TIPOS = [
  { value: 'empresa_junior', label: 'Empresa Júnior' },
  { value: 'escritorio_advocacia', label: 'Escritório de Advocacia' },
  { value: 'startup', label: 'Startup' },
  { value: 'empresa_design', label: 'Empresa de Design' },
  { value: 'empresa_gestao', label: 'Empresa de Gestão' },
  { value: 'arquiteto_senior', label: 'Arquiteto Sênior' },
  { value: 'outro', label: 'Outro' },
]

// Reward types (Clube de Parceiros CONSEJ)
export const REWARD_TYPES = [
  { value: 'desconto_contrato', label: 'Desconto no Contrato' },
  { value: 'presente_especial', label: 'Presente Especial' },
  { value: 'nenhuma', label: 'Sem recompensa' },
]

// Indicacao status
export const INDICACAO_STATUS = [
  { value: 'pendente', label: 'Pendente', color: 'bg-slate-100 text-slate-600' },
  { value: 'contactado', label: 'Contactado', color: 'bg-blue-100 text-blue-700' },
  { value: 'em_negociacao', label: 'Em Negociação', color: 'bg-amber-100 text-amber-700' },
  { value: 'convertido', label: 'Convertido', color: 'bg-green-100 text-green-700' },
  { value: 'perdido', label: 'Perdido', color: 'bg-red-100 text-red-700' },
]

// Client status
export const CLIENT_STATUS_OPTIONS = [
  { value: 'ativo', label: 'Ativo', color: 'bg-green-100 text-green-700' },
  { value: 'em_renovacao', label: 'Em Renovação', color: 'bg-amber-100 text-amber-700' },
  { value: 'encerrado', label: 'Encerrado', color: 'bg-slate-100 text-slate-600' },
]

// RM status
export const RM_STATUS_OPTIONS = [
  { value: 'verificar', label: 'Verificar', color: 'text-red-600 bg-red-50 border-red-200' },
  { value: 'possivel', label: 'Possível', color: 'text-green-700 bg-green-50 border-green-200' },
  { value: 'em_andamento', label: 'Em Andamento', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { value: 'registrado', label: 'Registrado', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { value: 'nao_aplicavel', label: 'Não se aplica', color: 'text-slate-500 bg-slate-50 border-slate-200' },
]

// Oportunidade types
export const OPORTUNIDADE_TIPOS = [
  { value: 'upsell', label: 'Upsell' },
  { value: 'cross_sell', label: 'Cross-sell' },
  { value: 'renovacao', label: 'Renovação' },
]

export const OPORTUNIDADE_STATUS = [
  { value: 'identificada', label: 'Identificada', color: 'bg-slate-100 text-slate-700' },
  { value: 'abordada', label: 'Abordada', color: 'bg-blue-100 text-blue-700' },
  { value: 'em_proposta', label: 'Em Proposta', color: 'bg-amber-100 text-amber-700' },
  { value: 'convertida', label: 'Convertida', color: 'bg-green-100 text-green-700' },
  { value: 'descartada', label: 'Descartada', color: 'bg-red-100 text-red-700' },
]

// Budget options (from diagnostic)
export const BUDGET_OPTIONS = [
  { value: 'ate_500', label: 'Até R$500' },
  { value: '500_2k', label: 'R$500 – R$2.000' },
  { value: '2k_5k', label: 'R$2.000 – R$5.000' },
  { value: '5k_10k', label: 'R$5.000 – R$10.000' },
  { value: 'acima_10k', label: 'Acima de R$10.000' },
]

// Clusters (from existing consej-crm)
export const CLUSTERS = [
  { value: '1-2', label: 'Cluster 1-2 (Governança)' },
  { value: '3-4', label: 'Cluster 3-4 (Contratos)' },
  { value: '5', label: 'Cluster 5 (Assessoria Completa)' },
  { value: 'resgate', label: 'Assessoria por Resgate' },
]
