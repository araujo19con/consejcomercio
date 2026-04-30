import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { TokenTransacao, CatalogoRecompensa, Resgate, Campanha } from '@/types'

// ─── Perfil do portal (cliente) ──────────────────────────────────────────────

export function usePortalPerfil() {
  return useQuery({
    queryKey: ['portal-perfil'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return null
      const { data, error } = await supabase
        .from('perfis')
        .select('id, nome, email, foto_url, tipo, cliente_id, tokens_saldo, tokens_historico_total')
        .eq('id', session.user.id)
        .single()
      if (error) throw error
      return data
    },
  })
}

// ─── Histórico de transações ─────────────────────────────────────────────────

export function useTokenTransacoes() {
  return useQuery({
    queryKey: ['token-transacoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('token_transacoes')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as TokenTransacao[]
    },
  })
}

// ─── Catálogo de recompensas ─────────────────────────────────────────────────

export function useCatalogoRecompensas() {
  return useQuery({
    queryKey: ['catalogo-recompensas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalogo_recompensas')
        .select('*')
        .eq('ativo', true)
        .order('custo_tokens', { ascending: true })
      if (error) throw error
      return (data ?? []) as CatalogoRecompensa[]
    },
  })
}

// ─── Resgates do usuário ─────────────────────────────────────────────────────

export function useResgates() {
  return useQuery({
    queryKey: ['resgates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resgates')
        .select('*, catalogo:catalogo_recompensas(*)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Resgate[]
    },
  })
}

// ─── Mutation: solicitar resgate (via RPC SECURITY DEFINER) ──────────────────

export function useSolicitarResgate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ catalogo }: {
      catalogo: CatalogoRecompensa
      perfilId?: string
      saldoAtual?: number
    }) => {
      const { error } = await supabase.rpc('solicitar_resgate_portal', {
        p_catalogo_id: catalogo.id,
      })
      if (error) {
        // Mapear erros do PG para mensagens amigáveis
        if (error.message.includes('saldo_insuficiente')) {
          throw new Error('Saldo insuficiente')
        }
        if (error.message.includes('recompensa_indisponivel')) {
          throw new Error('Recompensa indisponível no momento')
        }
        throw new Error('Erro ao solicitar resgate. Tente novamente.')
      }
      return catalogo
    },
    onSuccess: (catalogo) => {
      queryClient.invalidateQueries({ queryKey: ['portal-perfil'] })
      queryClient.invalidateQueries({ queryKey: ['token-transacoes'] })
      queryClient.invalidateQueries({ queryKey: ['resgates'] })
      toast.success(
        catalogo.aprovacao_dupla
          ? `Resgate solicitado! Aguardando aprovação da CONSEJ.`
          : `Resgate registrado! A CONSEJ entrará em contato em breve.`
      )
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Erro ao solicitar resgate.')
    },
  })
}

// ─── Campanhas promocionais ativas ───────────────────────────────────────────

export function useCampanhasAtivas() {
  return useQuery({
    queryKey: ['campanhas-ativas'],
    queryFn: async () => {
      const nowIso = new Date().toISOString()
      const { data, error } = await supabase
        .from('campanhas_promocionais')
        .select('*')
        .eq('ativa', true)
        .eq('destaque', true)
        .lte('data_inicio', nowIso)
        .gte('data_fim', nowIso)
        .order('data_fim', { ascending: true })
      if (error) throw error
      return (data ?? []) as Campanha[]
    },
  })
}

// ─── Indicações feitas no portal (cliente OU consultor interno) ──────────────

export function useMinhasIndicacoes(perfilId: string | null | undefined, clienteId?: string | null) {
  return useQuery({
    queryKey: ['minhas-indicacoes', perfilId, clienteId ?? null],
    enabled: !!perfilId,
    queryFn: async () => {
      // Filtra por indicante_perfil_id (preenchido em todas indicações novas via
      // migration 023). Para indicações legadas de clientes, faz fallback via
      // indicante_cliente_id usando OR.
      let query = supabase
        .from('indicacoes')
        .select('id, indicado_nome, indicado_empresa, status, created_at')
        .order('created_at', { ascending: false })

      if (clienteId) {
        query = query.or(`indicante_perfil_id.eq.${perfilId},indicante_cliente_id.eq.${clienteId}`)
      } else {
        query = query.eq('indicante_perfil_id', perfilId!)
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as Array<{
        id: string
        indicado_nome: string
        indicado_empresa: string | null
        status: string
        created_at: string
      }>
    },
  })
}

// ─── Mutation: enviar indicação (RPC SECURITY DEFINER) ───────────────────────
// Usa enviar_indicacao_portal (migration 022) que cria lead + indicacao +
// crédito de tokens + update do saldo atomicamente, sem expor INSERT direto
// em token_transacoes ou UPDATE em perfis para o cliente.

export function useEnviarIndicacaoPortal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ form }: {
      form: { nome: string; empresa: string; telefone: string; email?: string; segmento?: string }
      perfilId?: string
      clienteId?: string | null
      saldoAtual?: number
      historicoTotal?: number
    }) => {
      const { data, error } = await supabase.rpc('enviar_indicacao_portal', {
        p_nome: form.nome,
        p_empresa: form.empresa,
        p_telefone: form.telefone,
        p_email: form.email ?? null,
        p_segmento: form.segmento ?? null,
      })
      if (error) {
        if (error.message.includes('limite_indicacoes_atingido')) {
          throw new Error('Você atingiu o limite de 10 indicações ativas.')
        }
        if (error.message.includes('perfil_sem_cliente_vinculado')) {
          throw new Error('Seu perfil não está vinculado a um cliente. Contate o suporte.')
        }
        if (error.message.includes('tipo_invalido_para_indicar') ||
            error.message.includes('apenas_cliente_pode_indicar')) {
          throw new Error('Seu perfil não tem permissão para enviar indicações.')
        }
        throw new Error('Erro ao enviar indicação. Tente novamente.')
      }
      return {
        indicacao: { id: (data as { indicacao_id: string }).indicacao_id },
        tokens: (data as { tokens_creditados: number }).tokens_creditados,
      }
    },
    onSuccess: ({ tokens }) => {
      queryClient.invalidateQueries({ queryKey: ['portal-perfil'] })
      queryClient.invalidateQueries({ queryKey: ['token-transacoes'] })
      queryClient.invalidateQueries({ queryKey: ['minhas-indicacoes'] })
      toast.success(`Indicação enviada! +${tokens} tokens creditados na sua carteira.`)
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Erro ao enviar indicação.')
    },
  })
}
