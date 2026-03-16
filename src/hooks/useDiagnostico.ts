import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { QUERY_KEYS } from '@/lib/query-keys'
import type { Diagnostico } from '@/types'
import { getClusterRecommendation } from '@/lib/diagnostic-utils'
import { toast } from 'sonner'

export function useDiagnostico(leadId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.diagnosticos.byLead(leadId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diagnosticos')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle()
      if (error) throw error
      return data as Diagnostico | null
    },
    enabled: !!leadId,
  })
}

export function useSaveDiagnostico() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ leadId, answers }: { leadId: string; answers: Partial<Diagnostico> }) => {
      const rec = getClusterRecommendation(answers)
      const payload = {
        lead_id: leadId,
        ...answers,
        cluster_recomendado: rec.suggestedCluster,
        servicos_urgentes: rec.urgentServices,
        completed_at: new Date().toISOString(),
      }
      const { data, error } = await supabase
        .from('diagnosticos')
        .upsert(payload, { onConflict: 'lead_id' })
        .select()
        .single()
      if (error) throw error
      // Advance lead status to diagnostico_realizado
      await supabase.from('leads').update({ status: 'diagnostico_realizado' }).eq('id', leadId)
      return data as Diagnostico
    },
    onSuccess: (diag) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.diagnosticos.byLead(diag.lead_id) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leads.all })
      toast.success('Diagnóstico salvo com sucesso!')
    },
    onError: () => toast.error('Erro ao salvar diagnóstico'),
  })
}
