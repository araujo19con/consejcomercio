import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { QUERY_KEYS } from '@/lib/query-keys'
import type { AuditLog } from '@/types'

export function useAuditLogs(tabela: string, registroId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.audit_logs.byEntity(tabela, registroId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('tabela', tabela)
        .eq('registro_id', registroId)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data as AuditLog[]
    },
    enabled: !!tabela && !!registroId,
  })
}
