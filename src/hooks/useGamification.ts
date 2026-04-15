import { useMemo } from 'react'
import { isThisMonth } from 'date-fns'
import { useLeads } from './useLeads'
import { useReunioes } from './useReunioes'
import { usePerfis, useMeuPerfil } from './usePerfis'
import { useContratos } from './useContratos'
import { useConfiguracoes, DEFAULT_METAS } from './useConfiguracoes'
import type { MetasConfig } from '@/types'

// ─── Badge definitions ────────────────────────────────────────────────────────

export interface BadgeInfo {
  id: string
  emoji: string
  label: string
  description: string
}

const ALL_BADGES: BadgeInfo[] = [
  {
    id: 'primeiro_fechamento',
    emoji: '🎯',
    label: 'Primeiro Fechamento',
    description: 'Primeiro deal ganho',
  },
  {
    id: 'em_chamas',
    emoji: '🔥',
    label: 'Em Chamas',
    description: '3+ deals fechados no mesmo mês',
  },
  {
    id: 'alto_valor',
    emoji: '💎',
    label: 'Alto Valor',
    description: 'Contrato ativo acima de R$ 5.000',
  },
  {
    id: 'rede_forte',
    emoji: '🤝',
    label: 'Rede Forte',
    description: '5+ leads de indicação prospectados',
  },
  {
    id: 'diagnostico_ativo',
    emoji: '🩺',
    label: 'Diagnóstico Ativo',
    description: '10+ diagnósticos aplicados',
  },
  {
    id: 'lider_mes',
    emoji: '🏆',
    label: 'Líder do Mês',
    description: 'Maior pontuação do mês corrente',
  },
]

function badge(id: string): BadgeInfo {
  return ALL_BADGES.find(b => b.id === id)!
}

// ─── Ranking entry ────────────────────────────────────────────────────────────

export interface RankingEntry {
  perfil: { id: string; nome: string; cargo?: string; foto_url?: string }
  pontos: number          // all-time total
  pontos_mes: number      // current month only
  leads_prospectados: number
  leads_fechados: number
  leads_fechados_mes: number
  diagnosticos: number
  reunioes: number
  mrr_gerado: number
  indicacoes: number
  badges: BadgeInfo[]
  rank: number
}

// ─── Main hook ────────────────────────────────────────────────────────────────

export function useRanking(): RankingEntry[] {
  const { data: leads = [] }     = useLeads()
  const { data: reunioes = [] }  = useReunioes()
  const { data: perfis = [] }    = usePerfis()
  const { data: contratos = [] } = useContratos()
  const { data: config }         = useConfiguracoes()

  return useMemo(() => {
    // Merge configured point values with defaults
    const pts: MetasConfig = { ...DEFAULT_METAS, ...(config?.metas ?? {}) }

    const entries = perfis.map(perfil => {
      const uid = perfil.id

      // ── Leads prospectados (assigned to this user) ──────────────────────────
      const myLeads = leads.filter(l => l.responsavel_id === uid)
      const leads_prospectados = myLeads.length

      // ── Leads fechados ──────────────────────────────────────────────────────
      // Primary: fechado_por_id set explicitly (after migration runs)
      // Fallback: responsavel_id on won leads (pre-migration bulk data)
      const myClosedLeads = leads.filter(l =>
        (l.status === 'ganho_assessoria' || l.status === 'ganho_consultoria') &&
        (l.fechado_por_id === uid || (l.fechado_por_id == null && l.responsavel_id === uid))
      )
      const leads_fechados = myClosedLeads.length
      const leads_fechados_mes = myClosedLeads.filter(l =>
        isThisMonth(new Date(l.updated_at))
      ).length

      // ── Diagnósticos aplicados ──────────────────────────────────────────────
      const diagnosticos = myLeads.filter(l => l.diagnostico?.completed_at).length
      const diagnosticosThisMonth = myLeads.filter(l =>
        l.diagnostico?.completed_at && isThisMonth(new Date(l.diagnostico.completed_at))
      ).length

      // ── Reuniões realizadas ──────────────────────────────────────────────────
      const reunioes_count = reunioes.filter(r =>
        r.responsavel_id === uid && r.status === 'realizada'
      ).length
      const reunioesThisMonth = reunioes.filter(r =>
        r.responsavel_id === uid && r.status === 'realizada' && isThisMonth(new Date(r.data_hora))
      ).length

      // ── Indicações (leads via referral assigned to this user) ───────────────
      const indicacoes = myLeads.filter(l =>
        l.origem === 'indicacao_cliente' || l.origem === 'indicacao_parceiro'
      ).length

      // ── MRR gerado (contratos ativos com responsável = este usuário) ─────────
      const mrr_gerado = contratos
        .filter(c => c.responsavel_id === uid && c.status === 'ativo')
        .reduce((sum, c) => sum + (c.valor_mensal ?? 0), 0)

      // ── Pipeline stages (for bonus points) ──────────────────────────────────
      const emProposta = myLeads.filter(l => l.status === 'proposta_comercial').length
      const emNegociacao = myLeads.filter(l => l.status === 'negociacao').length

      // ── All-time points ──────────────────────────────────────────────────────
      const pontos =
        leads_prospectados * pts.pontos_lead_criado +
        emProposta         * pts.pontos_proposta +
        emNegociacao       * pts.pontos_negociacao +
        diagnosticos       * pts.pontos_diagnostico +
        reunioes_count     * pts.pontos_reuniao +
        indicacoes         * pts.pontos_indicacao +
        myClosedLeads.filter(l => l.status === 'ganho_assessoria').length  * pts.pontos_ganho_assessoria +
        myClosedLeads.filter(l => l.status === 'ganho_consultoria').length * pts.pontos_ganho_consultoria

      // ── Monthly points ───────────────────────────────────────────────────────
      const leadsThisMonth = myLeads.filter(l => isThisMonth(new Date(l.created_at))).length
      const closedAssessoriaThisMonth = myClosedLeads.filter(l =>
        l.status === 'ganho_assessoria' && isThisMonth(new Date(l.updated_at))
      ).length
      const closedConsultoriaThisMonth = myClosedLeads.filter(l =>
        l.status === 'ganho_consultoria' && isThisMonth(new Date(l.updated_at))
      ).length

      const pontos_mes =
        leadsThisMonth           * pts.pontos_lead_criado +
        diagnosticosThisMonth    * pts.pontos_diagnostico +
        reunioesThisMonth        * pts.pontos_reuniao +
        closedAssessoriaThisMonth  * pts.pontos_ganho_assessoria +
        closedConsultoriaThisMonth * pts.pontos_ganho_consultoria

      // ── Badges ───────────────────────────────────────────────────────────────
      const badges: BadgeInfo[] = []
      if (leads_fechados >= 1)  badges.push(badge('primeiro_fechamento'))
      if (leads_fechados_mes >= 3) badges.push(badge('em_chamas'))
      if (diagnosticos >= 10)   badges.push(badge('diagnostico_ativo'))
      if (indicacoes >= 5)      badges.push(badge('rede_forte'))
      const hasHighValue = contratos.some(
        c => c.responsavel_id === uid && (c.valor_total ?? 0) > 5000
      )
      if (hasHighValue) badges.push(badge('alto_valor'))

      return {
        perfil,
        pontos,
        pontos_mes,
        leads_prospectados,
        leads_fechados,
        leads_fechados_mes,
        diagnosticos,
        reunioes: reunioes_count,
        mrr_gerado,
        indicacoes,
        badges,
      }
    })

    // Sort by pontos_mes desc, then all-time pontos as tiebreaker
    const sorted = [...entries].sort(
      (a, b) => b.pontos_mes - a.pontos_mes || b.pontos - a.pontos
    )

    // Award "Líder do Mês" to the user with highest pontos_mes (> 0)
    if (sorted.length > 0 && sorted[0].pontos_mes > 0) {
      if (!sorted[0].badges.find(b => b.id === 'lider_mes')) {
        sorted[0].badges = [badge('lider_mes'), ...sorted[0].badges]
      }
    }

    return sorted.map((e, i) => ({ ...e, rank: i + 1 }))
  }, [leads, reunioes, perfis, contratos, config])
}

// ─── Current user's entry ─────────────────────────────────────────────────────

export function useMeusPontos(): RankingEntry | null {
  const ranking = useRanking()
  const { data: meuPerfil } = useMeuPerfil()

  return useMemo(
    () => (meuPerfil ? (ranking.find(e => e.perfil.id === meuPerfil.id) ?? null) : null),
    [ranking, meuPerfil]
  )
}

// ─── Team goal progress (this month) ─────────────────────────────────────────

export interface TeamProgress {
  metas: MetasConfig
  leads_fechados_mes: number
  mrr_mes: number
  diagnosticos_mes: number
  reunioes_mes: number
}

export function useTeamProgress(): TeamProgress {
  const { data: leads = [] }     = useLeads()
  const { data: reunioes = [] }  = useReunioes()
  const { data: contratos = [] } = useContratos()
  const { data: config }         = useConfiguracoes()

  return useMemo(() => {
    const metas: MetasConfig = { ...DEFAULT_METAS, ...(config?.metas ?? {}) }

    const leads_fechados_mes = leads.filter(l =>
      (l.status === 'ganho_assessoria' || l.status === 'ganho_consultoria') &&
      isThisMonth(new Date(l.updated_at))
    ).length

    const mrr_mes = contratos
      .filter(c => c.status === 'ativo' && c.valor_mensal)
      .reduce((sum, c) => sum + (c.valor_mensal ?? 0), 0)

    const diagnosticos_mes = leads.filter(l =>
      l.diagnostico?.completed_at && isThisMonth(new Date(l.diagnostico.completed_at))
    ).length

    const reunioes_mes = reunioes.filter(r =>
      r.status === 'realizada' && isThisMonth(new Date(r.data_hora))
    ).length

    return { metas, leads_fechados_mes, mrr_mes, diagnosticos_mes, reunioes_mes }
  }, [leads, reunioes, contratos, config])
}
