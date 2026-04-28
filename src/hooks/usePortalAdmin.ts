import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { TokenTransacao, Resgate } from '@/types'

// ─── Todos os clientes com acesso ao portal ───────────────────────────────────

export interface PortalCliente {
  id: string
  nome: string
  email: string
  foto_url?: string | null
  tokens_saldo: number
  tokens_historico_total: number
  cliente_id?: string | null
  created_at: string
}

export function usePortalClientes() {
  return useQuery({
    queryKey: ['portal-admin-clientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('perfis')
        .select('id, nome, email, foto_url, tokens_saldo, tokens_historico_total, cliente_id, created_at')
        .eq('tipo', 'cliente')
        .order('tokens_historico_total', { ascending: false })
      if (error) throw error
      return (data ?? []) as PortalCliente[]
    },
  })
}

// ─── Transações de um cliente específico ─────────────────────────────────────

export function useTransacoesCliente(perfilId: string | null) {
  return useQuery({
    queryKey: ['portal-admin-transacoes', perfilId],
    enabled: !!perfilId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('token_transacoes')
        .select('*')
        .eq('perfil_id', perfilId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as TokenTransacao[]
    },
  })
}

// ─── Todos os resgates (admin) ────────────────────────────────────────────────

export interface ResgateAdmin extends Resgate {
  perfil?: { nome: string; email: string } | null
}

export function useAllResgates() {
  return useQuery({
    queryKey: ['portal-admin-resgates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resgates')
        .select('*, catalogo:catalogo_recompensas(*), perfil:perfis(nome, email)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as ResgateAdmin[]
    },
  })
}

// ─── Mutation: atualizar status de resgate ────────────────────────────────────

export function useAtualizarResgate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status, aprovadoPorId }: {
      id: string
      status: 'aprovado' | 'entregue' | 'cancelado'
      aprovadoPorId: string
    }) => {
      const { error } = await supabase
        .from('resgates')
        .update({ status, aprovado_por_id: aprovadoPorId, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['portal-admin-resgates'] })
      const labels = { aprovado: 'Resgate aprovado', entregue: 'Marcado como entregue', cancelado: 'Resgate cancelado' }
      toast.success(labels[status])
    },
    onError: () => toast.error('Erro ao atualizar resgate.'),
  })
}

// ─── Mutation: creditar tokens manualmente ────────────────────────────────────

export const MOTIVOS_CREDITO = [
  { value: 'cadastro',         label: 'Boas-vindas ao programa' },
  { value: 'rd_realizada',     label: 'Diagnóstico realizado pelo indicado' },
  { value: 'contrato_fechado', label: 'Contrato fechado pelo indicado' },
  { value: 'renovacao',        label: 'Renovação de contrato' },
  { value: 'nps',              label: 'Avaliação NPS' },
  { value: 'depoimento',       label: 'Depoimento em vídeo/case' },
  { value: 'evento',           label: 'Participação em evento CONSEJ' },
  { value: 'aniversario',      label: 'Aniversário do cliente' },
  { value: 'bonus',            label: 'Bônus especial' },
]

export function useCreditarTokens() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ perfilId, motivo, valor, descricao }: {
      perfilId: string
      motivo: string
      valor: number
      descricao?: string
    }) => {
      // 1. Buscar saldo atual
      const { data: perfil, error: errPerfil } = await supabase
        .from('perfis')
        .select('tokens_saldo, tokens_historico_total')
        .eq('id', perfilId)
        .single()
      if (errPerfil) throw errPerfil

      // 2. Registrar transação
      const { error: errTx } = await supabase
        .from('token_transacoes')
        .insert({
          perfil_id: perfilId,
          tipo: 'credito',
          motivo,
          valor,
          descricao: descricao || null,
        })
      if (errTx) throw errTx

      // 3. Atualizar saldo e histórico no perfil
      const { error: errUpdate } = await supabase
        .from('perfis')
        .update({
          tokens_saldo: perfil.tokens_saldo + valor,
          tokens_historico_total: perfil.tokens_historico_total + valor,
        })
        .eq('id', perfilId)
      if (errUpdate) throw errUpdate
    },
    onSuccess: (_, { valor }) => {
      queryClient.invalidateQueries({ queryKey: ['portal-admin-clientes'] })
      queryClient.invalidateQueries({ queryKey: ['portal-admin-transacoes'] })
      queryClient.invalidateQueries({ queryKey: ['portal-admin-resgates'] })
      toast.success(`+${valor} tokens creditados com sucesso!`)
    },
    onError: () => toast.error('Erro ao creditar tokens. Verifique as permissões RLS.'),
  })
}
