import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { QUERY_KEYS } from '@/lib/query-keys'
import type { Contrato } from '@/types'
import { differenceInDays } from 'date-fns'
import { toast } from 'sonner'

export function useContratos() {
  return useQuery({
    queryKey: QUERY_KEYS.contratos.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contratos')
        .select('*, cliente:clientes(id, nome, empresa, segmento)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Contrato[]
    },
  })
}

export function useContratosByCliente(clienteId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.contratos.byCliente(clienteId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contratos')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Contrato[]
    },
    enabled: !!clienteId,
  })
}

export function useCreateContrato() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<Contrato, 'id' | 'created_at' | 'updated_at' | 'cliente'>) => {
      const { data, error } = await supabase.from('contratos').insert(input).select().single()
      if (error) throw error
      return data as Contrato
    },
    onSuccess: async (contrato) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contratos.all })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contratos.byCliente(contrato.cliente_id) })
      // Auto-generate cross-sell opportunities
      const oportunidades = []
      if (!contrato.areas_direito.includes('propriedade_intelectual')) {
        oportunidades.push({ cliente_id: contrato.cliente_id, contrato_id: contrato.id, tipo: 'cross_sell', servico_alvo: 'registro_marca', titulo: 'Registro de Marca no INPI', descricao: 'Cliente ainda não tem proteção de marca registrada', status: 'identificada' })
      }
      if (!contrato.areas_direito.includes('digital')) {
        oportunidades.push({ cliente_id: contrato.cliente_id, contrato_id: contrato.id, tipo: 'cross_sell', servico_alvo: 'lgpd', titulo: 'Adequação LGPD', descricao: 'Cliente pode precisar de conformidade com a LGPD', status: 'identificada' })
      }
      if (contrato.data_fim && differenceInDays(new Date(contrato.data_fim), new Date()) <= 90) {
        oportunidades.push({ cliente_id: contrato.cliente_id, contrato_id: contrato.id, tipo: 'renovacao', servico_alvo: 'renovacao', titulo: 'Renovação de Contrato', descricao: `Contrato próximo do vencimento`, status: 'identificada', data_alerta: contrato.data_fim })
      }
      if (oportunidades.length > 0) {
        await supabase.from('oportunidades').insert(oportunidades)
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.oportunidades.all })
      }
      supabase.from('audit_logs').insert({ tabela: 'contratos', registro_id: contrato.id, acao: 'criado', valor_depois: contrato })
      toast.success('Contrato criado!')
    },
    onError: () => toast.error('Erro ao criar contrato'),
  })
}

export function useUpdateContrato() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Contrato> & { id: string }) => {
      const { data, error } = await supabase.from('contratos').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data as Contrato
    },
    onSuccess: (contrato) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contratos.all })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contratos.byCliente(contrato.cliente_id) })
      toast.success('Contrato atualizado!')
    },
  })
}
