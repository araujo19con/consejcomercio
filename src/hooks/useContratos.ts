import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { QUERY_KEYS } from '@/lib/query-keys'
import type { Contrato, ServicoConfig } from '@/types'
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

      // ── Catalog-driven cross-sell & up-sell opportunities ──────────────
      const oportunidades: object[] = []

      // Fetch service catalog from configuracoes
      const { data: cfgData } = await supabase
        .from('configuracoes')
        .select('servicos')
        .eq('id', 'default')
        .single()
      const catalogo: ServicoConfig[] = cfgData?.servicos ?? []
      const areasCliente = contrato.areas_direito ?? []
      const seenServicos = new Set<string>()

      // For each active catalog service: if the contract doesn't cover its area → cross-sell
      for (const servico of catalogo.filter(s => s.ativo && s.area_direito)) {
        if (!areasCliente.includes(servico.area_direito!)) {
          if (!seenServicos.has(servico.id)) {
            seenServicos.add(servico.id)
            oportunidades.push({
              cliente_id: contrato.cliente_id,
              contrato_id: contrato.id,
              tipo: 'cross_sell',
              servico_alvo: servico.id,
              titulo: servico.nome,
              descricao: servico.descricao || `Oportunidade de cross-sell: ${servico.nome}`,
              status: 'identificada',
            })
          }
        }
      }

      // Also include explicit cross_sells from services the client already has
      for (const servico of catalogo.filter(s => s.ativo && s.area_direito && areasCliente.includes(s.area_direito!))) {
        for (const crossId of servico.cross_sells ?? []) {
          if (!seenServicos.has(crossId)) {
            const crossServico = catalogo.find(s => s.id === crossId)
            if (crossServico) {
              seenServicos.add(crossId)
              oportunidades.push({
                cliente_id: contrato.cliente_id,
                contrato_id: contrato.id,
                tipo: 'cross_sell',
                servico_alvo: crossServico.id,
                titulo: crossServico.nome,
                descricao: crossServico.descricao || `Complementa o serviço de ${servico.nome}`,
                status: 'identificada',
              })
            }
          }
        }
      }

      // Renovação: alert when contract nears expiry
      if (contrato.data_fim && differenceInDays(new Date(contrato.data_fim), new Date()) <= 90) {
        oportunidades.push({
          cliente_id: contrato.cliente_id,
          contrato_id: contrato.id,
          tipo: 'renovacao',
          servico_alvo: 'renovacao',
          titulo: 'Renovação de Contrato',
          descricao: 'Contrato próximo do vencimento',
          status: 'identificada',
          data_alerta: contrato.data_fim,
        })
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

export function useDeleteContrato() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, clienteId }: { id: string; clienteId: string }) => {
      const { error } = await supabase.from('contratos').delete().eq('id', id)
      if (error) throw error
      return { id, clienteId }
    },
    onSuccess: ({ clienteId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contratos.all })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contratos.byCliente(clienteId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.oportunidades.all })
      toast.success('Contrato excluído.')
    },
    onError: () => toast.error('Erro ao excluir contrato'),
  })
}
