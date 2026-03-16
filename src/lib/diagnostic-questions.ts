import type { Diagnostico } from '@/types'

export type QuestionOption = {
  value: string
  label: string
}

export type Question = {
  key: keyof Diagnostico
  label: string
  options: QuestionOption[]
}

export type Section = {
  id: string
  title: string
  emoji: string
  questions: Question[]
}

export const SECTIONS: Section[] = [
  {
    id: 'civil', title: 'Direito Civil', emoji: '⚖️',
    questions: [
      {
        key: 'civil_q1',
        label: 'Como está o Estatuto Social / Contrato Social da empresa?',
        options: [
          { value: 'atualizado', label: 'Atualizado e compatível com a operação atual' },
          { value: 'desatualizado', label: 'Desatualizado ou com cláusulas que não refletem a realidade' },
          { value: 'inexistente', label: 'Não temos / não sei se temos' },
          { value: 'nao_sei', label: 'Não sei informar' },
        ],
      },
      {
        key: 'civil_q2',
        label: 'A empresa possui Regimento Interno alinhado com as operações atuais?',
        options: [
          { value: 'sim', label: 'Sim, está atualizado' },
          { value: 'em_andamento', label: 'Existe, mas está desatualizado' },
          { value: 'nao', label: 'Não possuímos' },
        ],
      },
      {
        key: 'civil_q3',
        label: 'A documentação de troca de gestão está organizada?',
        options: [
          { value: 'sim_documentado', label: 'Sim, tudo documentado e arquivado' },
          { value: 'sim_nao_documentado', label: 'Houve troca, mas sem documentação formal' },
          { value: 'nao', label: 'Não se aplica' },
        ],
      },
    ],
  },
  {
    id: 'empresarial', title: 'Direito Empresarial', emoji: '🏢',
    questions: [
      {
        key: 'empresarial_q1',
        label: 'Como está a estrutura societária atual?',
        options: [
          { value: 'sociedade_simples', label: 'Sociedade Simples — sem mudanças previstas' },
          { value: 'ltda', label: 'Ltda. / SA — estrutura definida' },
          { value: 'mudancas_previstas', label: 'Planejando mudanças de sócios ou estrutura' },
          { value: 'informal', label: 'Ainda informal / MEI' },
        ],
      },
      {
        key: 'empresarial_q2',
        label: 'Existe acordo de sócios definindo participações, decisões e saída?',
        options: [
          { value: 'sim_atualizado', label: 'Sim, atualizado e assinado por todos' },
          { value: 'sim_desatualizado', label: 'Existe, mas está desatualizado' },
          { value: 'nao', label: 'Não temos acordo formal' },
        ],
      },
    ],
  },
  {
    id: 'contratos', title: 'Direito Contratual', emoji: '📝',
    questions: [
      {
        key: 'contratual_q1',
        label: 'A empresa utiliza contratos formais com clientes e parceiros?',
        options: [
          { value: 'sempre', label: 'Sempre — todos os projetos têm contrato' },
          { value: 'as_vezes', label: 'Às vezes — dependendo do valor/cliente' },
          { value: 'raramente', label: 'Raramente — maioria é informal' },
          { value: 'nunca', label: 'Nunca utilizamos contratos formais' },
        ],
      },
      {
        key: 'contratual_q2',
        label: 'Já houve problemas com clientes ou fornecedores por falhas em contratos?',
        options: [
          { value: 'sim', label: 'Sim — já tivemos prejuízos por isso' },
          { value: 'quase', label: 'Quase — situações que poderiam ter sido evitadas' },
          { value: 'nao', label: 'Não — nunca tivemos problemas' },
        ],
      },
      {
        key: 'contratual_q3',
        label: 'Como a empresa lida com clientes inadimplentes?',
        options: [
          { value: 'sim_recorrente', label: 'É um problema recorrente, sem processo claro' },
          { value: 'sim_pontual', label: 'Já aconteceu pontualmente' },
          { value: 'nao', label: 'Raramente ou nunca acontece' },
        ],
      },
    ],
  },
  {
    id: 'digital', title: 'Direito Digital', emoji: '🌐',
    questions: [
      {
        key: 'digital_q1',
        label: 'A empresa está em conformidade com a LGPD? (Política de Privacidade, Termos de Uso)',
        options: [
          { value: 'completo', label: 'Sim — temos tudo implementado e revisado' },
          { value: 'parcial', label: 'Parcialmente — temos algo, mas não está completo' },
          { value: 'nao_tem', label: 'Não temos nada implementado' },
          { value: 'nao_sei', label: 'Não sei avaliar nossa conformidade' },
        ],
      },
    ],
  },
  {
    id: 'trabalhista', title: 'Direito Trabalhista', emoji: '👥',
    questions: [
      {
        key: 'trabalhista_q1',
        label: 'Quantos colaboradores a empresa tem e como são contratados?',
        options: [
          { value: '0', label: 'Nenhum — apenas sócios/voluntários' },
          { value: '1_3_pj', label: '1 a 3 — PJ (prestadores de serviço)' },
          { value: '1_3_clt', label: '1 a 3 — CLT (empregados formais)' },
          { value: '4_mais', label: '4 ou mais colaboradores' },
          { value: 'voluntarios', label: 'Somente voluntários (EJ/associação)' },
        ],
      },
      {
        key: 'trabalhista_q2',
        label: 'Os contratos de trabalho/prestação de serviço são formalizados?',
        options: [
          { value: 'sim', label: 'Sim — contratos individuais e revisados' },
          { value: 'parcial', label: 'Parcialmente — usamos modelos genéricos' },
          { value: 'nao', label: 'Não — acordos informais ou verbais' },
        ],
      },
    ],
  },
  {
    id: 'pi_investimento', title: 'Propriedade Intelectual & Investimento', emoji: '™️',
    questions: [
      {
        key: 'pi_q1',
        label: 'A marca da empresa está registrada no INPI?',
        options: [
          { value: 'sim', label: 'Sim — registro ativo' },
          { value: 'em_andamento', label: 'Em andamento — processo iniciado' },
          { value: 'nao_ainda', label: 'Não — mas temos interesse em registrar' },
          { value: 'nao_pretende', label: 'Não temos interesse no momento' },
        ],
      },
      {
        key: 'investimento_q1',
        label: 'Qual seria o investimento ideal para resolver essas questões jurídicas?',
        options: [
          { value: 'ate_500', label: 'Até R$500' },
          { value: '500_2k', label: 'R$500 – R$2.000' },
          { value: '2k_5k', label: 'R$2.000 – R$5.000' },
          { value: '5k_10k', label: 'R$5.000 – R$10.000' },
          { value: 'acima_10k', label: 'Acima de R$10.000' },
        ],
      },
    ],
  },
]
