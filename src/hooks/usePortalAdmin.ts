import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { TokenTransacao, Resgate, RegraToken, Campanha, CatalogoRecompensa } from '@/types'

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

// ─── REGRAS DE TOKENS ─────────────────────────────────────────────────────────

export function useRegrasTokens() {
  return useQuery({
    queryKey: ['regras-tokens'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regras_tokens')
        .select('*')
        .order('ordem', { ascending: true })
      if (error) throw error
      return (data ?? []) as RegraToken[]
    },
  })
}

export function useSalvarRegra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (regra: Partial<RegraToken> & { motivo: string; label: string; valor_tokens: number }) => {
      if (regra.id) {
        const { error } = await supabase
          .from('regras_tokens')
          .update({
            label: regra.label,
            descricao: regra.descricao ?? null,
            valor_tokens: regra.valor_tokens,
            ativo: regra.ativo ?? true,
            ordem: regra.ordem ?? 0,
          })
          .eq('id', regra.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('regras_tokens')
          .insert({
            motivo: regra.motivo,
            label: regra.label,
            descricao: regra.descricao ?? null,
            valor_tokens: regra.valor_tokens,
            ativo: regra.ativo ?? true,
            ordem: regra.ordem ?? 0,
          })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['regras-tokens'] })
      toast.success('Regra salva')
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  })
}

export function useExcluirRegra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('regras_tokens').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['regras-tokens'] })
      toast.success('Regra excluída')
    },
    onError: () => toast.error('Erro ao excluir'),
  })
}

// ─── CATÁLOGO (CRUD admin) ────────────────────────────────────────────────────

export function useCatalogoTodos() {
  return useQuery({
    queryKey: ['catalogo-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalogo_recompensas')
        .select('*')
        .order('custo_tokens', { ascending: true })
      if (error) throw error
      return (data ?? []) as CatalogoRecompensa[]
    },
  })
}

export function useSalvarRecompensa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (item: Partial<CatalogoRecompensa> & { nome: string; tier: CatalogoRecompensa['tier']; custo_tokens: number }) => {
      const payload = {
        nome: item.nome,
        descricao: item.descricao ?? null,
        tier: item.tier,
        custo_tokens: item.custo_tokens,
        aprovacao_dupla: item.aprovacao_dupla ?? false,
        ativo: item.ativo ?? true,
      }
      if (item.id) {
        const { error } = await supabase.from('catalogo_recompensas').update(payload).eq('id', item.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('catalogo_recompensas').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalogo-admin'] })
      qc.invalidateQueries({ queryKey: ['catalogo-recompensas'] })
      toast.success('Recompensa salva')
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  })
}

export function useExcluirRecompensa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('catalogo_recompensas').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalogo-admin'] })
      qc.invalidateQueries({ queryKey: ['catalogo-recompensas'] })
      toast.success('Recompensa excluída')
    },
    onError: () => toast.error('Erro ao excluir'),
  })
}

// ─── CAMPANHAS ────────────────────────────────────────────────────────────────

export function useCampanhasTodas() {
  return useQuery({
    queryKey: ['campanhas-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campanhas_promocionais')
        .select('*')
        .order('data_fim', { ascending: false })
      if (error) throw error
      return (data ?? []) as Campanha[]
    },
  })
}

export function useSalvarCampanha() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (c: Partial<Campanha> & { titulo: string; descricao: string; data_fim: string }) => {
      const payload = {
        titulo: c.titulo,
        descricao: c.descricao,
        cor: c.cor ?? '#f59e0b',
        icone: c.icone ?? 'sparkles',
        data_inicio: c.data_inicio ?? new Date().toISOString(),
        data_fim: c.data_fim,
        ativa: c.ativa ?? true,
        destaque: c.destaque ?? true,
      }
      if (c.id) {
        const { error } = await supabase.from('campanhas_promocionais').update(payload).eq('id', c.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('campanhas_promocionais').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campanhas-admin'] })
      qc.invalidateQueries({ queryKey: ['campanhas-ativas'] })
      toast.success('Campanha salva')
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  })
}

export function useExcluirCampanha() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('campanhas_promocionais').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campanhas-admin'] })
      qc.invalidateQueries({ queryKey: ['campanhas-ativas'] })
      toast.success('Campanha excluída')
    },
    onError: () => toast.error('Erro ao excluir'),
  })
}
