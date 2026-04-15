import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { QUERY_KEYS } from '@/lib/query-keys'
import type { Configuracoes, MetasConfig, ServicoConfig } from '@/types'
import { toast } from 'sonner'

export const DEFAULT_METAS: MetasConfig = {
  meta_leads_mes: 5,
  meta_mrr_mes: 5000,
  meta_diagnosticos_mes: 8,
  meta_reunioes_mes: 6,
  pontos_lead_criado: 5,
  pontos_proposta: 15,
  pontos_negociacao: 20,
  pontos_diagnostico: 20,
  pontos_reuniao: 15,
  pontos_ganho_assessoria: 100,
  pontos_ganho_consultoria: 60,
  pontos_indicacao: 30,
  recompensa_descricao: '',
}

export const DEFAULT_SERVICOS: ServicoConfig[] = [
  {
    id: 'assessoria_societaria',
    nome: 'Assessoria Societária',
    descricao: 'Elaboração e atualização de Contrato Social, Estatuto, documentação de governança e formalização empresarial',
    categoria: 'societario',
    tipo: 'complexa',
    valor: 1200,
    area_direito: 'civil',
    segmentos_icp: ['empresa_junior', 'startup', 'empresa_gestao'],
    investimento_icp: ['500_2k', '2k_5k'],
    cross_sells: ['revisao_contratos', 'documentacao_trabalhista'],
    up_sells: ['consultoria_empresarial'],
    ativo: true,
  },
  {
    id: 'acordo_socios',
    nome: 'Acordo de Sócios',
    descricao: 'Elaboração de acordo formal com regras de participação, votação, saída e resolução de conflitos entre sócios',
    categoria: 'societario',
    tipo: 'simples',
    valor: 800,
    area_direito: 'civil',
    segmentos_icp: ['empresa_junior', 'startup', 'empresa_senior'],
    investimento_icp: ['500_2k', '2k_5k'],
    cross_sells: ['assessoria_societaria'],
    up_sells: ['consultoria_empresarial'],
    ativo: true,
  },
  {
    id: 'revisao_contratos',
    nome: 'Revisão e Elaboração de Contratos',
    descricao: 'Contratos padrão para clientes, parceiros e fornecedores; revisão de cláusulas e proteção contra inadimplência',
    categoria: 'contratual',
    tipo: 'simples',
    valor: 600,
    area_direito: 'contratos',
    segmentos_icp: ['empresa_junior', 'empresa_design', 'escritorio_arquitetura', 'startup'],
    investimento_icp: ['500_2k', '2k_5k'],
    cross_sells: ['gestao_inadimplencia', 'assessoria_societaria'],
    up_sells: ['consultoria_empresarial'],
    ativo: true,
  },
  {
    id: 'gestao_inadimplencia',
    nome: 'Gestão de Inadimplência',
    descricao: 'Estruturação de processo de cobrança, notificações extrajudiciais e contratos com cláusulas anti-inadimplência',
    categoria: 'contratual',
    tipo: 'simples',
    valor: 500,
    area_direito: 'contratos',
    segmentos_icp: ['empresa_junior', 'empresa_design', 'escritorio_arquitetura'],
    investimento_icp: ['ate_500', '500_2k'],
    cross_sells: ['revisao_contratos'],
    up_sells: [],
    ativo: true,
  },
  {
    id: 'adequacao_lgpd',
    nome: 'Adequação LGPD',
    descricao: 'Política de Privacidade, Termos de Uso, mapeamento de dados pessoais e implementação de processos ANPD-compliant',
    categoria: 'digital',
    tipo: 'simples',
    valor: 900,
    area_direito: 'digital',
    segmentos_icp: ['startup', 'empresa_gestao', 'empresa_senior'],
    investimento_icp: ['500_2k', '2k_5k'],
    cross_sells: ['registro_marca'],
    up_sells: [],
    ativo: true,
  },
  {
    id: 'registro_marca',
    nome: 'Registro de Marca no INPI',
    descricao: 'Depósito e acompanhamento do processo de registro de marca junto ao INPI para proteção da identidade da empresa',
    categoria: 'pi',
    tipo: 'simples',
    valor: 800,
    area_direito: 'propriedade_intelectual',
    segmentos_icp: ['empresa_junior', 'startup', 'empresa_design', 'escritorio_arquitetura'],
    investimento_icp: ['500_2k', '2k_5k'],
    cross_sells: ['adequacao_lgpd'],
    up_sells: [],
    ativo: true,
  },
  {
    id: 'documentacao_trabalhista',
    nome: 'Documentação Trabalhista',
    descricao: 'Contratos de trabalho, políticas internas, acordos individuais e conformidade com CLT e legislação trabalhista vigente',
    categoria: 'trabalhista',
    tipo: 'simples',
    valor: 700,
    area_direito: 'trabalhista',
    segmentos_icp: ['startup', 'empresa_gestao', 'empresa_senior'],
    investimento_icp: ['500_2k', '2k_5k'],
    cross_sells: ['assessoria_societaria'],
    up_sells: ['consultoria_empresarial'],
    ativo: true,
  },
  {
    id: 'consultoria_empresarial',
    nome: 'Consultoria Empresarial',
    descricao: 'Consultoria jurídica estratégica para tomada de decisão, reestruturação societária e planejamento de crescimento',
    categoria: 'societario',
    tipo: 'complexa',
    valor: 2500,
    area_direito: 'empresarial',
    segmentos_icp: ['startup', 'empresa_senior', 'empresa_gestao'],
    investimento_icp: ['2k_5k', '5k_10k', 'acima_10k'],
    cross_sells: ['revisao_contratos', 'documentacao_trabalhista', 'adequacao_lgpd'],
    up_sells: [],
    ativo: true,
  },
]

const DEFAULT_CONFIGURACOES: Configuracoes = {
  id: 'default',
  alerta_renovacao_dias: 60,
  servicos: DEFAULT_SERVICOS,
  metas: DEFAULT_METAS,
  updated_at: new Date().toISOString(),
}

export function useConfiguracoes() {
  return useQuery({
    queryKey: QUERY_KEYS.configuracoes,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('id', 'default')
        .single()
      if (error) {
        // Table may not exist yet — return defaults gracefully
        return DEFAULT_CONFIGURACOES
      }
      // Merge DB servicos with any new default fields (backward compat)
      const servicoDefaults = {
        descricao: '',
        categoria: 'outro' as const,
        segmentos_icp: [] as string[],
        investimento_icp: [] as string[],
        cross_sells: [] as string[],
        up_sells: [] as string[],
        ativo: true,
      }
      const dbServicos: ServicoConfig[] = (data.servicos ?? []).map((s: ServicoConfig) => ({
        ...servicoDefaults,
        ...s,
      }))
      return { ...data, servicos: dbServicos } as Configuracoes
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useUpdateConfiguracoes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (updates: Partial<Omit<Configuracoes, 'id' | 'updated_at'>>) => {
      const { data, error } = await supabase
        .from('configuracoes')
        .upsert({ id: 'default', ...updates, updated_at: new Date().toISOString() })
        .select()
        .single()
      if (error) throw error
      return data as Configuracoes
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.configuracoes })
      toast.success('Configurações salvas!')
    },
    onError: () => toast.error('Erro ao salvar configurações'),
  })
}
