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

// ─── Mutation: solicitar resgate ─────────────────────────────────────────────

export function useSolicitarResgate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ catalogo, perfilId, saldoAtual }: {
      catalogo: CatalogoRecompensa
      perfilId: string
      saldoAtual: number
    }) => {
      if (saldoAtual < catalogo.custo_tokens) {
        throw new Error('Saldo insuficiente')
      }

      // 1. Inserir o resgate
      const { data: resgate, error: errResgate } = await supabase
        .from('resgates')
        .insert({
          perfil_id: perfilId,
          catalogo_id: catalogo.id,
          tokens_debitados: catalogo.custo_tokens,
          status: 'pendente',
        })
        .select()
        .single()
      if (errResgate) throw errResgate

      // 2. Registrar débito em token_transacoes
      const { error: errTx } = await supabase
        .from('token_transacoes')
        .insert({
          perfil_id: perfilId,
          tipo: 'debito',
          motivo: 'resgate',
          valor: catalogo.custo_tokens,
          referencia_tipo: 'resgate',
          referencia_id: resgate.id,
          descricao: catalogo.nome,
        })
      if (errTx) throw errTx

      // 3. Decrementar saldo no perfil
      const { error: errPerfil } = await supabase
        .from('perfis')
        .update({ tokens_saldo: saldoAtual - catalogo.custo_tokens })
        .eq('id', perfilId)
      if (errPerfil) throw errPerfil

      return resgate
    },
    onSuccess: (_, { catalogo }) => {
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

// ─── Indicações feitas pelo cliente (para rastreamento no portal) ────────────

export function useMinhasIndicacoes(clienteId: string | null | undefined) {
  return useQuery({
    queryKey: ['minhas-indicacoes', clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('indicacoes')
        .select('id, indicado_nome, indicado_empresa, status, created_at')
        .eq('indicante_cliente_id', clienteId!)
        .order('created_at', { ascending: false })
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

// ─── Mutation: enviar indicação (cliente via portal) ─────────────────────────

export function useEnviarIndicacaoPortal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ form, perfilId, clienteId, saldoAtual, historicoTotal }: {
      form: { nome: string; empresa: string; telefone: string; email?: string; segmento?: string }
      perfilId: string
      clienteId: string | null
      saldoAtual: number
      historicoTotal: number
    }) => {
      // 1. Criar lead no pipeline do CRM (entra como novo_lead no kanban)
      const segmento = form.segmento?.trim() || 'A definir'
      const { data: lead, error: errLead } = await supabase
        .from('leads')
        .insert({
          nome: form.nome,
          empresa: form.empresa,
          segmento,
          telefone: form.telefone,
          email: form.email ?? null,
          origem: 'indicacao_cliente',
          status: 'novo_lead',
          referido_por_cliente_id: clienteId,
          notas: 'Recebido via Portal de Indicações',
        })
        .select()
        .single()
      if (errLead) throw errLead

      // 2. Criar indicação vinculada ao lead recém-criado
      const { data: indicacao, error: errInd } = await supabase
        .from('indicacoes')
        .insert({
          indicante_cliente_id: clienteId,
          indicado_nome: form.nome,
          indicado_empresa: form.empresa,
          indicado_telefone: form.telefone,
          indicado_email: form.email ?? null,
          lead_id: lead.id,
          status: 'pendente',
          notas: form.segmento ? `Segmento: ${form.segmento}` : null,
        })
        .select()
        .single()
      if (errInd) throw errInd

      // Lê valor da regra ativa "indicacao" (com fallback para 100)
      const { data: regra } = await supabase
        .from('regras_tokens')
        .select('valor_tokens')
        .eq('motivo', 'indicacao')
        .eq('ativo', true)
        .maybeSingle()
      const TOKENS_INDICACAO = regra?.valor_tokens ?? 100

      // 2. Registrar crédito
      const { error: errTx } = await supabase
        .from('token_transacoes')
        .insert({
          perfil_id: perfilId,
          tipo: 'credito',
          motivo: 'indicacao',
          valor: TOKENS_INDICACAO,
          referencia_tipo: 'indicacao',
          referencia_id: indicacao.id,
          descricao: `Indicação de ${form.nome} — ${form.empresa}`,
        })
      if (errTx) throw errTx

      // 3. Atualizar saldo e histórico
      const { error: errPerfil } = await supabase
        .from('perfis')
        .update({
          tokens_saldo: saldoAtual + TOKENS_INDICACAO,
          tokens_historico_total: historicoTotal + TOKENS_INDICACAO,
        })
        .eq('id', perfilId)
      if (errPerfil) throw errPerfil

      return { indicacao, tokens: TOKENS_INDICACAO }
    },
    onSuccess: ({ tokens }) => {
      queryClient.invalidateQueries({ queryKey: ['portal-perfil'] })
      queryClient.invalidateQueries({ queryKey: ['token-transacoes'] })
      toast.success(`Indicação enviada! +${tokens} tokens creditados na sua carteira.`)
    },
    onError: () => {
      toast.error('Erro ao enviar indicação. Tente novamente.')
    },
  })
}
