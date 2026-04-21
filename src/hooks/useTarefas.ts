import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { QUERY_KEYS } from '@/lib/query-keys'
import type { Tarefa } from '@/types'
import { toast } from 'sonner'

export function useTarefas() {
  return useQuery({
    queryKey: QUERY_KEYS.tarefas.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tarefas')
        .select('*')
        .order('data_vencimento', { ascending: true, nullsFirst: false })
        .order('prioridade', { ascending: false })
      if (error) throw error
      return data as Tarefa[]
    },
  })
}

export function useMinhasTarefas(userId: string | undefined | null) {
  return useQuery({
    queryKey: QUERY_KEYS.tarefas.mine(userId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tarefas')
        .select('*')
        .eq('atribuido_a_id', userId)
        .in('status', ['aberta', 'em_andamento'])
        .order('data_vencimento', { ascending: true, nullsFirst: false })
      if (error) throw error
      return data as Tarefa[]
    },
    enabled: !!userId,
  })
}

export function useTarefasByEntidade(tipo: string | undefined, id: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.tarefas.byEntidade(tipo ?? '', id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tarefas')
        .select('*')
        .eq('entidade_tipo', tipo)
        .eq('entidade_id', id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Tarefa[]
    },
    enabled: !!tipo && !!id,
  })
}

export function useCreateTarefa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<Tarefa, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('tarefas').insert(input).select().single()
      if (error) throw error
      return data as Tarefa
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.tarefas.all })
      toast.success('Tarefa criada')
    },
    onError: () => toast.error('Erro ao criar tarefa'),
  })
}

export function useUpdateTarefa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Tarefa> & { id: string }) => {
      const { data, error } = await supabase
        .from('tarefas')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Tarefa
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.tarefas.all })
    },
    onError: () => toast.error('Erro ao atualizar tarefa'),
  })
}

export function useConcluirTarefa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('tarefas')
        .update({ status: 'concluida', data_conclusao: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Tarefa
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.tarefas.all })
      toast.success('Tarefa concluída')
    },
  })
}

export function useDeleteTarefa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tarefas').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.tarefas.all })
      toast.success('Tarefa removida')
    },
  })
}
