import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { QUERY_KEYS } from '@/lib/query-keys'
import type { Cliente } from '@/types'
import { toast } from 'sonner'

export function useClientes() {
  return useQuery({
    queryKey: QUERY_KEYS.clientes.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*, contratos(*)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Cliente[]
    },
  })
}

export function useCliente(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.clientes.byId(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*, contratos(*)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Cliente
    },
    enabled: !!id,
  })
}

export function useCreateCliente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<Cliente, 'id' | 'created_at' | 'updated_at' | 'contratos'>) => {
      const { data, error } = await supabase.from('clientes').insert(input).select().single()
      if (error) throw error
      return data as Cliente
    },
    onSuccess: (cliente) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clientes.all })
      supabase.from('audit_logs').insert({ tabela: 'clientes', registro_id: cliente.id, acao: 'criado', valor_depois: cliente })
      toast.success('Cliente criado!')
    },
    onError: () => toast.error('Erro ao criar cliente'),
  })
}

export function useUpdateCliente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Cliente> & { id: string }) => {
      const { data, error } = await supabase.from('clientes').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data as Cliente
    },
    onSuccess: (cliente) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clientes.all })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clientes.byId(cliente.id) })
      toast.success('Cliente atualizado!')
    },
  })
}

export function useDeleteCliente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clientes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clientes.all })
      toast.success('Cliente excluído!')
    },
    onError: () => toast.error('Erro ao excluir cliente'),
  })
}
