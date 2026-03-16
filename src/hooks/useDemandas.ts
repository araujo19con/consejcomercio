import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { QUERY_KEYS } from '@/lib/query-keys'
import type { Demanda } from '@/types'
import { toast } from 'sonner'

export function useDemandas() {
  return useQuery({
    queryKey: QUERY_KEYS.demandas.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demandas')
        .select('*, contrato:contratos(id, tipo, modelo_precificacao), cliente:clientes(id, nome, empresa)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Demanda[]
    },
  })
}

export function useCreateDemanda() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<Demanda, 'id' | 'created_at' | 'updated_at' | 'valor' | 'contrato' | 'cliente'>) => {
      const { data, error } = await supabase.from('demandas').insert(input).select().single()
      if (error) throw error
      return data as Demanda
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.demandas.all })
      toast.success('Demanda criada!')
    },
    onError: () => toast.error('Erro ao criar demanda'),
  })
}

export function useUpdateDemanda() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Demanda> & { id: string }) => {
      const { data, error } = await supabase.from('demandas').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data as Demanda
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.demandas.all })
      toast.success('Demanda atualizada!')
    },
  })
}
