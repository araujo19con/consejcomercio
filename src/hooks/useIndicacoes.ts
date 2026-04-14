import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { QUERY_KEYS } from '@/lib/query-keys'
import type { Indicacao } from '@/types'
import { toast } from 'sonner'

export function useIndicacoes() {
  return useQuery({
    queryKey: QUERY_KEYS.indicacoes.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('indicacoes')
        .select('*, indicante_cliente:clientes!indicante_cliente_id(id, nome, empresa), indicante_parceiro:parceiros!indicante_parceiro_id(id, nome, tipo), lead:leads(id, nome, empresa, status)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Indicacao[]
    },
  })
}

export function useCreateIndicacao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<Indicacao, 'id' | 'created_at' | 'updated_at' | 'indicante_cliente' | 'indicante_parceiro' | 'lead'>) => {
      const { data, error } = await supabase.from('indicacoes').insert(input).select().single()
      if (error) throw error
      return data as Indicacao
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.indicacoes.all })
      toast.success('Indicação registrada!')
    },
    onError: () => toast.error('Erro ao registrar indicação'),
  })
}

export function useUpdateIndicacao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Indicacao> & { id: string }) => {
      const { data, error } = await supabase.from('indicacoes').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data as Indicacao
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.indicacoes.all })
      toast.success('Indicação atualizada!')
    },
  })
}

export function useDeleteIndicacao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('indicacoes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.indicacoes.all })
      toast.success('Indicação excluída!')
    },
    onError: () => toast.error('Erro ao excluir indicação'),
  })
}
