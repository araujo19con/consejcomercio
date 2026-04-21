// Tarefas derivadas (client-side) — NÃO ficam no banco.
// São computadas do estado atual para oferecer um inbox unificado do usuário
// sem poluir a tabela `tarefas` com registros que espelham outras entidades.
//
// Tarefas persistidas (criadas manualmente ou por ações) vivem em `tarefas`.
// Tarefas derivadas aparecem no mesmo inbox com a flag `derivada = true`
// e não têm `id` do banco — o `id` é sintético a partir da origem.

import { differenceInDays, differenceInHours, isAfter, isBefore, startOfDay } from 'date-fns'
import type { Lead, Contrato, Oportunidade, InteracaoLead, TarefaPrioridade } from '@/types'
import type { Reuniao } from '@/hooks/useReunioes'
import { CADENCIA_DIAS } from './cadencia'
import { TERMINAL_STAGES } from './constants'

export interface TarefaDerivada {
  id: string                // sintético: "derivada:<tipo>:<entidadeId>"
  derivada: true
  titulo: string
  descricao?: string
  tipo: string
  entidade_tipo: 'lead' | 'cliente' | 'contrato' | 'oportunidade' | 'reuniao'
  entidade_id: string
  prioridade: TarefaPrioridade
  data_vencimento?: string
  link: string              // rota para abrir a entidade
  atribuido_a_id?: string | null
  /** Ação rápida pra executar direto do inbox. */
  acao?: { label: string; rota: string }
}

interface DeriveArgs {
  meuId: string | null | undefined
  leads: Lead[]
  contratos: Contrato[]
  oportunidades: Oportunidade[]
  interacoes: InteracaoLead[]
  reunioes: Reuniao[]
  hoje?: Date
}

const STAGNANT_THRESHOLDS: Record<string, number> = {
  classificacao: 3,
  levantamento_oportunidade: 5,
  educar_lead: 7,
  proposta_comercial: 7,
  negociacao: 10,
  stand_by: 14,
}

function priByDias(diasAtraso: number): TarefaPrioridade {
  if (diasAtraso >= 7)  return 'critica'
  if (diasAtraso >= 3)  return 'alta'
  if (diasAtraso >= 1)  return 'media'
  return 'baixa'
}

function priByVencimento(data: Date, hoje: Date): TarefaPrioridade {
  const dias = differenceInDays(data, hoje)
  if (dias < 0)   return 'critica'
  if (dias <= 2)  return 'alta'
  if (dias <= 7)  return 'media'
  return 'baixa'
}

export function deriveTarefas(args: DeriveArgs): TarefaDerivada[] {
  const { meuId, leads, contratos, oportunidades, interacoes, reunioes } = args
  const hoje = args.hoje ?? new Date()
  const out: TarefaDerivada[] = []
  if (!meuId) return out

  // ─── 1. Reuniões próximas (próximas 48h) como atribuídas a mim ─────────
  for (const r of reunioes) {
    if (r.status !== 'agendada') continue
    if (r.responsavel_id && r.responsavel_id !== meuId) continue
    const data = new Date(r.data_hora)
    const horas = differenceInHours(data, hoje)
    if (horas < -1 || horas > 48) continue
    out.push({
      id: `derivada:reuniao_prep:${r.id}`,
      derivada: true,
      titulo: `Preparar reunião: ${r.titulo}`,
      descricao: `Em ${horas < 0 ? 'agora' : horas < 1 ? 'menos de 1h' : `~${horas}h`} · ${data.toLocaleString('pt-BR')}`,
      tipo: 'reuniao_prep',
      entidade_tipo: 'reuniao',
      entidade_id: r.id,
      prioridade: horas < 0 ? 'critica' : horas < 6 ? 'alta' : 'media',
      data_vencimento: r.data_hora,
      link: '/reunioes',
      atribuido_a_id: r.responsavel_id,
    })
  }

  // ─── 2. Renovações de contrato (≤30d até data_fim) ─────────────────────
  for (const c of contratos) {
    if (c.status !== 'ativo') continue
    if (!c.data_fim) continue
    if (c.responsavel_id && c.responsavel_id !== meuId) continue
    const fim = new Date(c.data_fim)
    const dias = differenceInDays(fim, hoje)
    if (dias < -30 || dias > 30) continue
    out.push({
      id: `derivada:renovacao:${c.id}`,
      derivada: true,
      titulo: `Renovar contrato ${c.cliente?.nome ? `— ${c.cliente.nome}` : ''}`,
      descricao: dias < 0
        ? `Vencido há ${-dias} dia(s)`
        : `Vence em ${dias} dia(s) · ${fim.toLocaleDateString('pt-BR')}`,
      tipo: 'renovacao',
      entidade_tipo: 'contrato',
      entidade_id: c.id,
      prioridade: dias < 0 ? 'critica' : dias <= 7 ? 'alta' : 'media',
      data_vencimento: c.data_fim,
      link: '/contratos',
      atribuido_a_id: c.responsavel_id,
    })
  }

  // ─── 3. Leads estagnados atribuídos a mim ──────────────────────────────
  for (const l of leads) {
    if (l.responsavel_id !== meuId) continue
    if ((TERMINAL_STAGES as readonly string[]).includes(l.status)) continue
    const threshold = STAGNANT_THRESHOLDS[l.status] ?? 7
    const dias = differenceInDays(hoje, new Date(l.updated_at))
    if (dias < threshold) continue
    const atraso = dias - threshold
    out.push({
      id: `derivada:lead_estagnado:${l.id}`,
      derivada: true,
      titulo: `Lead parado: ${l.nome} — ${l.empresa}`,
      descricao: `Em "${l.status}" há ${dias} dias (limite ${threshold}d)`,
      tipo: 'followup',
      entidade_tipo: 'lead',
      entidade_id: l.id,
      prioridade: priByDias(atraso),
      link: `/leads/${l.id}`,
      atribuido_a_id: l.responsavel_id,
      acao: {
        label: 'Mensagem',
        rota: `/mensagens?leadId=${l.id}&nome=${encodeURIComponent(l.nome)}&empresa=${encodeURIComponent(l.empresa ?? '')}`,
      },
    })
  }

  // ─── 4. Leads na cadência devida hoje (atribuídos a mim) ───────────────
  for (const l of leads) {
    if (l.responsavel_id !== meuId) continue
    if ((TERMINAL_STAGES as readonly string[]).includes(l.status)) continue
    const leadInter = interacoes.filter(i => i.lead_id === l.id)
    const ultima = leadInter[0]
    const ref = ultima ? new Date(ultima.enviada_em) : new Date(l.created_at)
    const dias = differenceInDays(startOfDay(hoje), startOfDay(ref))
    const ponto = CADENCIA_DIAS.find(p => p.dia === dias)
    if (!ponto) continue
    // evita duplicar com o estagnado (o estagnado já cobre leads parados)
    if (out.some(t => t.id === `derivada:lead_estagnado:${l.id}`)) continue
    out.push({
      id: `derivada:cadencia:${l.id}:${ponto.dia}`,
      derivada: true,
      titulo: `Cadência ${ponto.label}: ${l.nome}`,
      descricao: `${ponto.descricao} · ${l.empresa}`,
      tipo: 'followup',
      entidade_tipo: 'lead',
      entidade_id: l.id,
      prioridade: 'media',
      link: `/leads/${l.id}`,
      atribuido_a_id: l.responsavel_id,
      acao: {
        label: 'Abordar',
        rota: `/mensagens?leadId=${l.id}&nome=${encodeURIComponent(l.nome)}&empresa=${encodeURIComponent(l.empresa ?? '')}&stage=${ponto.stage}`,
      },
    })
  }

  // ─── 5. Oportunidades com data_alerta vencida/próxima ──────────────────
  for (const o of oportunidades) {
    if (o.status === 'convertida' || o.status === 'descartada') continue
    if (!o.data_alerta) continue
    const alerta = new Date(o.data_alerta)
    const dias = differenceInDays(alerta, hoje)
    if (dias > 7) continue
    out.push({
      id: `derivada:oportunidade:${o.id}`,
      derivada: true,
      titulo: `Oportunidade: ${o.titulo}`,
      descricao: dias < 0
        ? `Alerta venceu há ${-dias} dia(s)`
        : `Alerta em ${dias} dia(s)`,
      tipo: 'upsell',
      entidade_tipo: 'oportunidade',
      entidade_id: o.id,
      prioridade: priByVencimento(alerta, hoje),
      data_vencimento: o.data_alerta,
      link: '/oportunidades',
    })
  }

  // ─── Ordenação: vencidas → vencendo hoje → futuras; por prioridade ─────
  const PRI_ORDER: Record<TarefaPrioridade, number> = { critica: 0, alta: 1, media: 2, baixa: 3 }
  out.sort((a, b) => {
    const pa = PRI_ORDER[a.prioridade] ?? 99
    const pb = PRI_ORDER[b.prioridade] ?? 99
    if (pa !== pb) return pa - pb
    const da = a.data_vencimento ? new Date(a.data_vencimento).getTime() : Infinity
    const db = b.data_vencimento ? new Date(b.data_vencimento).getTime() : Infinity
    return da - db
  })

  return out
}

/** Helper para detectar tarefas vencidas. */
export function isVencida(dataVencimento?: string | null, hoje: Date = new Date()): boolean {
  if (!dataVencimento) return false
  return isBefore(new Date(dataVencimento), hoje)
}

/** Helper para tarefas que vencem hoje. */
export function venceHoje(dataVencimento?: string | null, hoje: Date = new Date()): boolean {
  if (!dataVencimento) return false
  const d = new Date(dataVencimento)
  return isAfter(d, startOfDay(hoje)) && isBefore(d, startOfDay(new Date(hoje.getTime() + 24 * 3600 * 1000)))
}
