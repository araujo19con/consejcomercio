import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { QUERY_KEYS } from '@/lib/query-keys'
import { toast } from 'sonner'
import type { PosJunior } from '@/types'

const POS_JUNIORS_KEY = QUERY_KEYS.pos_juniors.all

export function usePosJuniors() {
  return useQuery({
    queryKey: POS_JUNIORS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pos_juniors')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as PosJunior[]
    },
  })
}

type CreatePosJuniorInput = Omit<PosJunior, 'id' | 'created_at'>

export function useCreatePosJunior() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreatePosJuniorInput) => {
      const { data, error } = await supabase
        .from('pos_juniors')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as PosJunior
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POS_JUNIORS_KEY })
      toast.success('Pós-Junior cadastrado!')
    },
    onError: () => toast.error('Erro ao cadastrar Pós-Junior'),
  })
}

type UpdatePosJuniorInput = Partial<CreatePosJuniorInput> & { id: string }

export function useUpdatePosJunior() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdatePosJuniorInput) => {
      const { data, error } = await supabase
        .from('pos_juniors')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as PosJunior
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POS_JUNIORS_KEY })
      toast.success('Pós-Junior atualizado!')
    },
    onError: () => toast.error('Erro ao atualizar Pós-Junior'),
  })
}

export function useDeletePosJunior() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pos_juniors')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POS_JUNIORS_KEY })
      toast.success('Pós-Junior excluído!')
    },
    onError: () => toast.error('Erro ao excluir Pós-Junior'),
  })
}
