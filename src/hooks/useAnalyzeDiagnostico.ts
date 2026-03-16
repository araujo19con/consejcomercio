import { useMutation } from '@tanstack/react-query'
import type { Diagnostico } from '@/types'

export type ServicoRecomendado = {
  nome: string
  justificativa: string
  prioridade: 'alta' | 'media' | 'baixa'
}

export type AnaliseIA = {
  resumo: string
  necessidades: string[]
  fraquezas: string[]
  servicos_recomendados: ServicoRecomendado[]
}

// ---------------------------------------------------------------------------
// Engine de análise baseada em regras — 100% gratuita, sem API externa
// ---------------------------------------------------------------------------
function analisarDiagnostico(answers: Partial<Diagnostico>): AnaliseIA {
  const necessidades: string[] = []
  const fraquezas: string[] = []
  const servicos: ServicoRecomendado[] = []
  const perfil: string[] = []

  // ── Direito Civil ──────────────────────────────────────────────────────
  if (answers.civil_q1 === 'inexistente') {
    necessidades.push('Elaboração do Contrato/Estatuto Social da empresa')
    fraquezas.push('Empresa sem constituição jurídica formal — risco de responsabilidade pessoal dos sócios')
    servicos.push({ nome: 'Assessoria Societária', justificativa: 'Empresa sem Contrato Social ou Estatuto — necessidade urgente de formalização', prioridade: 'alta' })
    perfil.push('sem constituição formal')
  } else if (answers.civil_q1 === 'desatualizado') {
    necessidades.push('Atualização do Contrato Social / Estatuto para refletir a realidade operacional')
    fraquezas.push('Contrato Social desatualizado pode invalidar decisões e gerar conflitos entre sócios')
    servicos.push({ nome: 'Assessoria Societária', justificativa: 'Contrato Social desatualizado gera insegurança jurídica nas operações', prioridade: 'alta' })
    perfil.push('documentação societária desatualizada')
  }

  if (answers.civil_q2 === 'nao') {
    necessidades.push('Criação de Regimento Interno para padronizar processos e responsabilidades')
    fraquezas.push('Ausência de Regimento Interno facilita conflitos internos e decisões sem respaldo formal')
    servicos.push({ nome: 'Regimento Interno e Governança', justificativa: 'Sem Regimento Interno, a empresa opera sem regras claras de conduta e decisão', prioridade: 'media' })
  } else if (answers.civil_q2 === 'em_andamento') {
    necessidades.push('Revisão e atualização do Regimento Interno vigente')
  }

  if (answers.civil_q3 === 'sim_nao_documentado') {
    necessidades.push('Documentação formal da última troca de gestão')
    fraquezas.push('Troca de gestão não documentada — risco de disputas sobre responsabilidades passadas')
    servicos.push({ nome: 'Documentação de Troca de Gestão', justificativa: 'Gestão anterior não formalizada cria passivos jurídicos para a nova gestão', prioridade: 'alta' })
    perfil.push('transição de gestão mal documentada')
  }

  // ── Direito Empresarial ────────────────────────────────────────────────
  if (answers.empresarial_q1 === 'informal') {
    necessidades.push('Formalização da estrutura empresarial (saída do MEI ou informalidade)')
    fraquezas.push('Operação informal expõe patrimônio pessoal dos sócios a riscos empresariais')
    servicos.push({ nome: 'Assessoria Societária', justificativa: 'Formalização da empresa protege patrimônio pessoal e viabiliza contratos maiores', prioridade: 'alta' })
    perfil.push('estrutura informal/MEI')
  } else if (answers.empresarial_q1 === 'mudancas_previstas') {
    necessidades.push('Assessoria jurídica para reestruturação societária planejada')
    servicos.push({ nome: 'Assessoria Societária', justificativa: 'Mudanças de sócios ou estrutura exigem documentação precisa para evitar litígios', prioridade: 'media' })
  }

  if (answers.empresarial_q2 === 'nao') {
    necessidades.push('Elaboração de Acordo de Sócios com regras de participação, votação e saída')
    fraquezas.push('Sem Acordo de Sócios, conflitos internos podem paralisar a empresa ou resultar em processos judiciais')
    servicos.push({ nome: 'Acordo de Sócios', justificativa: 'Ausência de acordo formal é a principal causa de dissolução empresarial prematura', prioridade: 'alta' })
    perfil.push('sem acordo de sócios')
  } else if (answers.empresarial_q2 === 'sim_desatualizado') {
    necessidades.push('Atualização do Acordo de Sócios conforme mudanças na estrutura da empresa')
    fraquezas.push('Acordo de Sócios desatualizado pode não cobrir situações atuais da empresa')
  }

  // ── Direito Contratual ─────────────────────────────────────────────────
  if (answers.contratual_q1 === 'nunca' || answers.contratual_q1 === 'raramente') {
    necessidades.push('Implementação de contratos padrão para todos os projetos e parcerias')
    fraquezas.push('Operações sem contrato formal deixam a empresa sem respaldo jurídico em caso de inadimplência ou disputas')
    servicos.push({ nome: 'Revisão e Elaboração de Contratos', justificativa: 'Empresa sem contratos formais está vulnerável a calotes, disputas e perdas financeiras', prioridade: 'alta' })
    perfil.push('operações sem contratos formais')
  } else if (answers.contratual_q1 === 'as_vezes') {
    necessidades.push('Padronização do uso de contratos para todos os clientes e parceiros')
    servicos.push({ nome: 'Revisão e Elaboração de Contratos', justificativa: 'Contratos usados apenas às vezes criam inconsistência jurídica e riscos desnecessários', prioridade: 'media' })
  }

  if (answers.contratual_q2 === 'sim') {
    necessidades.push('Revisão e fortalecimento dos contratos vigentes para prevenir novos prejuízos')
    fraquezas.push('Histórico de problemas contratuais indica cláusulas insuficientes de proteção')
    servicos.push({ nome: 'Revisão e Elaboração de Contratos', justificativa: 'Prejuízos anteriores por falhas contratuais requerem revisão imediata dos modelos utilizados', prioridade: 'alta' })
  } else if (answers.contratual_q2 === 'quase') {
    fraquezas.push('Contratos atuais têm lacunas que já quase causaram problemas — revisão preventiva indicada')
  }

  if (answers.contratual_q3 === 'sim_recorrente') {
    necessidades.push('Estruturação de processo de cobrança e gestão de inadimplência')
    fraquezas.push('Inadimplência recorrente sem processo claro compromete o fluxo de caixa e a sustentabilidade')
    servicos.push({ nome: 'Gestão de Inadimplência e Cobrança', justificativa: 'Problema recorrente exige processo estruturado de cobrança e cláusulas contratuais mais robustas', prioridade: 'alta' })
    perfil.push('inadimplência recorrente')
  }

  // ── Direito Digital / LGPD ────────────────────────────────────────────
  if (answers.digital_q1 === 'nao_tem') {
    necessidades.push('Implementação completa de conformidade LGPD (Política de Privacidade + Termos de Uso + DPO)')
    fraquezas.push('Empresa sem conformidade LGPD sujeita a multas de até R$50 milhões e sanções administrativas')
    servicos.push({ nome: 'Adequação LGPD', justificativa: 'Total ausência de conformidade digital — risco imediato de autuações pela ANPD', prioridade: 'alta' })
    perfil.push('sem conformidade LGPD')
  } else if (answers.digital_q1 === 'nao_sei') {
    necessidades.push('Auditoria de conformidade LGPD para mapear lacunas e riscos')
    fraquezas.push('Desconhecimento sobre LGPD indica provável não-conformidade e exposição a riscos')
    servicos.push({ nome: 'Adequação LGPD', justificativa: 'Incerteza sobre conformidade LGPD é sinal de lacunas que precisam ser diagnosticadas', prioridade: 'alta' })
  } else if (answers.digital_q1 === 'parcial') {
    necessidades.push('Complementação da conformidade LGPD com os documentos e processos faltantes')
    fraquezas.push('Conformidade LGPD parcial ainda expõe a empresa a penalidades')
    servicos.push({ nome: 'Adequação LGPD', justificativa: 'Documentação digital incompleta — revisão necessária para atingir conformidade total', prioridade: 'media' })
  }

  // ── Direito Trabalhista ────────────────────────────────────────────────
  if (answers.trabalhista_q1 === '4_mais') {
    necessidades.push('Assessoria trabalhista contínua para equipe com 4 ou mais colaboradores')
    fraquezas.push('Equipes maiores têm maior exposição a reclamações trabalhistas — passivo oculto significativo')
    servicos.push({ nome: 'Documentação Trabalhista', justificativa: 'Equipe com 4+ colaboradores requer compliance trabalhista rigoroso para evitar passivos', prioridade: 'alta' })
  } else if (answers.trabalhista_q1 === '1_3_clt' || answers.trabalhista_q1 === '1_3_pj') {
    if (answers.trabalhista_q2 !== 'sim') {
      necessidades.push('Formalização dos contratos de trabalho ou prestação de serviço vigentes')
    }
  }

  if (answers.trabalhista_q2 === 'nao') {
    fraquezas.push('Acordos verbais ou informais de trabalho são juridicamente frágeis e podem gerar passivos trabalhistas')
    servicos.push({ nome: 'Documentação Trabalhista', justificativa: 'Relações de trabalho sem contrato formal são a principal origem de processos trabalhistas', prioridade: 'alta' })
  } else if (answers.trabalhista_q2 === 'parcial') {
    fraquezas.push('Contratos de trabalho baseados em modelos genéricos podem ter cláusulas insuficientes para a realidade da empresa')
    if (!servicos.find(s => s.nome === 'Documentação Trabalhista')) {
      servicos.push({ nome: 'Documentação Trabalhista', justificativa: 'Modelos genéricos de contrato de trabalho geralmente não cobrem especificidades do negócio', prioridade: 'media' })
    }
  }

  // ── Propriedade Intelectual ────────────────────────────────────────────
  if (answers.pi_q1 === 'nao_ainda') {
    necessidades.push('Registro da marca no INPI para proteção da identidade da empresa')
    fraquezas.push('Marca sem registro pode ser copiada ou registrada por terceiros, causando perda de identidade e receita')
    servicos.push({ nome: 'Registro de Marca no INPI', justificativa: 'Marca não registrada está exposta ao risco de uso indevido e bloqueio por concorrentes', prioridade: 'media' })
  } else if (answers.pi_q1 === 'em_andamento') {
    necessidades.push('Acompanhamento do processo de registro da marca no INPI')
  }

  // ── Planejamento preventivo (quando perfil é saudável) ─────────────────
  if (necessidades.length === 0) {
    necessidades.push('Manutenção e atualização periódica da documentação jurídica')
    necessidades.push('Monitoramento de mudanças legislativas que possam impactar o negócio')
    servicos.push({ nome: 'Planejamento Jurídico Preventivo', justificativa: 'Empresa com boa conformidade deve manter revisões periódicas para preservar essa condição', prioridade: 'baixa' })
  }

  if (fraquezas.length === 0) {
    fraquezas.push('Baixo nível de vulnerabilidade identificado — manter revisões preventivas periódicas')
  }

  // ── Resumo ────────────────────────────────────────────────────────────
  const totalRiscos = necessidades.length
  let resumo: string

  if (perfil.length === 0 && totalRiscos <= 2) {
    resumo = 'Empresa com boa conformidade jurídica. Recomenda-se manutenção preventiva para preservar a segurança atual.'
  } else if (totalRiscos <= 3) {
    resumo = `Perfil jurídico com exposição moderada — ${perfil.join(', ') || 'algumas lacunas identificadas'}. Ação preventiva recomendada para evitar riscos futuros.`
  } else {
    resumo = `Perfil jurídico com múltiplas exposições (${perfil.join(', ') || 'várias áreas críticas'}). Intervenção jurídica prioritária para proteção da empresa e seus sócios.`
  }

  // Deduplica serviços por nome, mantendo a maior prioridade
  const servicosMap = new Map<string, ServicoRecomendado>()
  const ordem = { alta: 0, media: 1, baixa: 2 }
  for (const s of servicos) {
    const existing = servicosMap.get(s.nome)
    if (!existing || ordem[s.prioridade] < ordem[existing.prioridade]) {
      servicosMap.set(s.nome, s)
    }
  }

  return {
    resumo,
    necessidades: [...new Set(necessidades)],
    fraquezas: [...new Set(fraquezas)],
    servicos_recomendados: [...servicosMap.values()].sort((a, b) => ordem[a.prioridade] - ordem[b.prioridade]),
  }
}

export function useAnalyzeDiagnostico() {
  return useMutation({
    mutationFn: async (answers: Partial<Diagnostico>) => analisarDiagnostico(answers),
  })
}
