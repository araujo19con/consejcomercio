import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { QUERY_KEYS } from '@/lib/query-keys'
import type { Oportunidade } from '@/types'
import { toast } from 'sonner'

export function useOportunidades() {
  return useQuery({
    queryKey: QUERY_KEYS.oportunidades.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('oportunidades')
        .select('*, cliente:clientes(id, nome, empresa)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Oportunidade[]
    },
  })
}

export function useCreateOportunidade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<Oportunidade, 'id' | 'created_at' | 'updated_at' | 'cliente'>) => {
      const { data, error } = await supabase.from('oportunidades').insert(input).select().single()
      if (error) throw error
      return data as Oportunidade
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.oportunidades.all })
      toast.success('Oportunidade criada!')
    },
    onError: () => toast.error('Erro ao criar oportunidade'),
  })
}

export function useUpdateOportunidade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Oportunidade> & { id: string }) => {
      const { data, error } = await supabase.from('oportunidades').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data as Oportunidade
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.oportunidades.all })
      toast.success('Oportunidade atualizada!')
    },
  })
}

export function useDeleteOportunidade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('oportunidades').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.oportunidades.all })
      toast.success('Oportunidade excluída!')
    },
    onError: () => toast.error('Erro ao excluir oportunidade'),
  })
}
