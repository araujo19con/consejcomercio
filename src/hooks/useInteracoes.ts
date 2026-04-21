import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { QUERY_KEYS } from '@/lib/query-keys'
import type { InteracaoLead } from '@/types'
import { toast } from 'sonner'

export function useInteracoes() {
  return useQuery({
    queryKey: QUERY_KEYS.interacoes.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interacoes_lead')
        .select('*')
        .order('enviada_em', { ascending: false })
        .limit(2000)
      if (error) throw error
      return data as InteracaoLead[]
    },
  })
}

export function useInteracoesByLead(leadId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.interacoes.byLead(leadId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interacoes_lead')
        .select('*')
        .eq('lead_id', leadId)
        .order('enviada_em', { ascending: false })
      if (error) throw error
      return data as InteracaoLead[]
    },
    enabled: !!leadId,
  })
}

export function useCreateInteracao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (
      input: Omit<InteracaoLead, 'id' | 'created_at' | 'enviada_em'> & { enviada_em?: string }
    ) => {
      const { data, error } = await supabase
        .from('interacoes_lead')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as InteracaoLead
    },
    onSuccess: (interacao) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.interacoes.all })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.interacoes.byLead(interacao.lead_id) })
    },
    onError: () => toast.error('Erro ao registrar interação'),
  })
}
