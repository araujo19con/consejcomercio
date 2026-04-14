import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { QUERY_KEYS } from '@/lib/query-keys'
import type { Configuracoes } from '@/types'
import { toast } from 'sonner'

const DEFAULT_CONFIGURACOES: Configuracoes = {
  id: 'default',
  alerta_renovacao_dias: 60,
  servicos: [
    { id: 'simples', nome: 'Demanda Simples', tipo: 'simples', valor: 200 },
    { id: 'complexa', nome: 'Demanda Complexa', tipo: 'complexa', valor: 500 },
  ],
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
      return data as Configuracoes
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
