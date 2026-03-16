import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { QUERY_KEYS } from '@/lib/query-keys'
import type { Parceiro } from '@/types'
import { toast } from 'sonner'

export function useParceiros() {
  return useQuery({
    queryKey: QUERY_KEYS.parceiros.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parceiros')
        .select('*')
        .order('nome')
      if (error) throw error
      return data as Parceiro[]
    },
  })
}

export function useCreateParceiro() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<Parceiro, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('parceiros').insert(input).select().single()
      if (error) throw error
      return data as Parceiro
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.parceiros.all })
      toast.success('Parceiro cadastrado!')
    },
    onError: () => toast.error('Erro ao cadastrar parceiro'),
  })
}

export function useUpdateParceiro() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Parceiro> & { id: string }) => {
      const { data, error } = await supabase.from('parceiros').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data as Parceiro
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.parceiros.all })
      toast.success('Parceiro atualizado!')
    },
  })
}
