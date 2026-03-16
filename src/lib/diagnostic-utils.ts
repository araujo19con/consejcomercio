import type { DiagnosticAnswers } from '@/types'

export type ClusterRecommendation = {
  suggestedCluster: string
  urgentServices: string[]
  rationale: string[]
}

export function getClusterRecommendation(answers: Partial<DiagnosticAnswers>): ClusterRecommendation {
  const urgentServices: string[] = []
  const rationale: string[] = []
  const clusterScore: Record<string, number> = { '1-2': 0, '3-4': 0, '5': 0 }

  if (answers.civil_q1 === 'desatualizado' || answers.civil_q1 === 'inexistente') {
    urgentServices.push('Revisão do Estatuto/Contrato Social')
    rationale.push('Estatuto Social desatualizado ou inexistente')
    clusterScore['1-2'] += 2
  }
  if (answers.civil_q2 === 'nao') {
    urgentServices.push('Elaboração do Regimento Interno')
    clusterScore['1-2'] += 1
  }
  if (answers.civil_q3 === 'sim_nao_documentado') {
    urgentServices.push('Documentação de Troca de Gestão')
    rationale.push('Troca de gestão não documentada adequadamente')
    clusterScore['1-2'] += 2
  }
  if (answers.empresarial_q2 === 'nao' || answers.empresarial_q2 === 'sim_desatualizado') {
    urgentServices.push('Revisão do Contrato Social / Acordo de Sócios')
    clusterScore['1-2'] += 1
  }
  if (answers.contratual_q1 === 'raramente' || answers.contratual_q1 === 'nunca') {
    urgentServices.push('Assessoria Contratual')
    rationale.push('Ausência ou uso raro de contratos formais')
    clusterScore['3-4'] += 2
  }
  if (answers.contratual_q2 === 'sim') {
    urgentServices.push('Revisão e Padronização de Contratos')
    rationale.push('Problemas recorrentes por falhas contratuais')
    clusterScore['3-4'] += 2
  }
  if (answers.contratual_q3 === 'sim_recorrente') {
    urgentServices.push('Gestão de Inadimplência')
    clusterScore['3-4'] += 1
  }
  if (answers.digital_q1 === 'nao_tem' || answers.digital_q1 === 'nao_sei') {
    urgentServices.push('Adequação LGPD (Política de Privacidade + Termos de Uso)')
    rationale.push('Empresa sem conformidade com a LGPD')
    clusterScore['5'] += 2
  } else if (answers.digital_q1 === 'parcial') {
    urgentServices.push('Revisão de Conformidade LGPD')
    clusterScore['5'] += 1
  }
  if (answers.trabalhista_q1 === '4_mais') {
    urgentServices.push('Assessoria Trabalhista')
    rationale.push('Equipe com 4 ou mais colaboradores requer suporte trabalhista')
    clusterScore['5'] += 2
  }
  if (answers.trabalhista_q2 === 'nao' || answers.trabalhista_q2 === 'parcial') {
    urgentServices.push('Formalização de Contratos de Trabalho')
    clusterScore['5'] += 1
  }
  if (answers.pi_q1 === 'nao_ainda') {
    urgentServices.push('Registro de Marca no INPI')
    rationale.push('Marca sem proteção — risco de uso indevido por terceiros')
    clusterScore['3-4'] += 2
  }

  const entries = Object.entries(clusterScore).sort((a, b) => b[1] - a[1])
  let suggestedCluster = entries[0][0]
  if (entries[0][1] === 0) {
    suggestedCluster = '3-4'
    rationale.push('Perfil sem demandas urgentes — assessoria preventiva recomendada')
  }

  return {
    suggestedCluster,
    urgentServices: Array.from(new Set(urgentServices)),
    rationale: rationale.length > 0 ? rationale : ['Diagnóstico completo — veja os serviços recomendados abaixo'],
  }
}

export const CLUSTER_DESCRIPTIONS: Record<string, { label: string; services: string[]; price: string }> = {
  '1-2': {
    label: 'Cluster 1-2 — Governança Básica',
    services: ['Revisão Estatutária', 'Troca de Gestão', 'Regimento Interno', 'Contrato de Prestação de Serviços'],
    price: 'Consultar tabela de preços',
  },
  '3-4': {
    label: 'Cluster 3-4 — Assessoria Contratual',
    services: ['Contratos de Parceria', 'Contratos de Serviços', 'Revisão Contratual', 'Registro de Marca (RM)'],
    price: 'Consultar tabela de preços',
  },
  '5': {
    label: 'Cluster 5 — Assessoria Jurídica Completa',
    services: ['Demandas ilimitadas', 'LGPD completo', 'Gestão Contratual', 'Treinamento Jurídico', 'Suporte prioritário'],
    price: 'R$ 8.400 (8 meses) ou R$ 12.600 (12 meses)',
  },
  resgate: {
    label: 'Assessoria por Resgate',
    services: ['Regularização de pendências', 'Direito Civil e Contratual', 'Gestão Contratual', 'Direito Trabalhista'],
    price: 'R$ 200 (demanda simples) / R$ 500 (demanda complexa)',
  },
}
