import { useMemo } from 'react'
import { useAuditLogs } from '@/hooks/useAuditLogs'
import { useInteracoesByLead } from '@/hooks/useInteracoes'
import { PIPELINE_STAGES, CLIENT_STATUS_OPTIONS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { UserCheck, Edit3, Plus, ArrowRight, MessageCircle, Mail, Linkedin } from 'lucide-react'
import type { AuditLog, InteracaoLead } from '@/types'

type Props = {
  tabela: 'leads' | 'clientes' | 'contratos'
  registroId: string
}

type Entry =
  | { kind: 'audit'; id: string; data: AuditLog; ts: string }
  | { kind: 'interacao'; id: string; data: InteracaoLead; ts: string }

function getStageLabel(status: string) {
  return (
    PIPELINE_STAGES.find(s => s.id === status)?.label ??
    CLIENT_STATUS_OPTIONS.find(s => s.value === status)?.label ??
    status
  )
}

const MSG_STAGE_LABELS: Record<string, string> = {
  primeiro_contato: 'Primeiro Contato',
  followup:         'Follow-up',
  diagnostico:      'Diagnóstico',
  proposta:         'Proposta',
  negociacao:       'Negociação',
  pos_fechamento:   'Pós-Fechamento',
  reativacao:       'Reativação',
}

const CANAL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  email:    'E-mail',
  linkedin: 'LinkedIn',
}

function describeAudit(acao: string, campo: string | null | undefined, valorAntes: Record<string, unknown> | null | undefined, valorDepois: Record<string, unknown> | null | undefined) {
  if (acao === 'criado') return { label: 'Registro criado', detail: null }

  if (acao === 'status_alterado') {
    const antes = valorAntes?.status as string | undefined
    const depois = valorDepois?.status as string | undefined
    if (antes && depois) {
      return {
        label: 'Status alterado',
        detail: `${getStageLabel(antes)} → ${getStageLabel(depois)}`,
      }
    }
    if (depois) return { label: 'Status definido', detail: getStageLabel(depois) }
    return { label: 'Status alterado', detail: null }
  }

  if (campo) {
    const fieldLabels: Record<string, string> = {
      nome: 'Nome', empresa: 'Empresa', telefone: 'Telefone',
      email: 'E-mail', status: 'Status', notas: 'Observações',
      valor_total: 'Valor total', data_fim: 'Data de término',
      responsavel: 'Responsável', segmento: 'Segmento',
    }
    const label = fieldLabels[campo] ?? campo
    return { label: `${label} atualizado`, detail: null }
  }

  return { label: 'Dados atualizados', detail: null }
}

function getAuditIcon(acao: string) {
  if (acao === 'criado') return Plus
  if (acao === 'status_alterado') return ArrowRight
  if (acao === 'convertido') return UserCheck
  return Edit3
}

function getAuditAccent(acao: string) {
  if (acao === 'criado') return { dot: 'bg-emerald-500', text: 'text-emerald-400' }
  if (acao === 'status_alterado') return { dot: 'bg-[#0089ac]', text: 'text-[#6bd0e7]' }
  if (acao === 'convertido') return { dot: 'bg-violet-500', text: 'text-violet-400' }
  return { dot: 'bg-[rgba(130,150,170,0.4)]', text: 'text-muted-foreground' }
}

function getChannelIcon(canal: string) {
  if (canal === 'email') return Mail
  if (canal === 'linkedin') return Linkedin
  return MessageCircle
}

function getChannelAccent(canal: string) {
  if (canal === 'email') return { dot: 'bg-blue-500', text: 'text-blue-400' }
  if (canal === 'linkedin') return { dot: 'bg-sky-600', text: 'text-sky-400' }
  return { dot: 'bg-green-500', text: 'text-green-400' }  // WhatsApp
}

export function ActivityTimeline({ tabela, registroId }: Props) {
  const { data: logs, isLoading: loadingLogs } = useAuditLogs(tabela, registroId)
  const { data: interacoes, isLoading: loadingInteracoes } = useInteracoesByLead(
    tabela === 'leads' ? registroId : undefined
  )

  const entries: Entry[] = useMemo(() => {
    const audits: Entry[] = (logs ?? []).map(log => ({
      kind: 'audit',
      id: `audit-${log.id}`,
      data: log,
      ts: log.created_at,
    }))
    const inter: Entry[] = (interacoes ?? []).map(i => ({
      kind: 'interacao',
      id: `interacao-${i.id}`,
      data: i,
      ts: i.enviada_em,
    }))
    return [...audits, ...inter].sort((a, b) => (a.ts < b.ts ? 1 : -1))
  }, [logs, interacoes])

  const isLoading = loadingLogs || (tabela === 'leads' && loadingInteracoes)

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-[var(--alpha-bg-md)] mt-1.5 shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-32 rounded bg-[var(--alpha-bg-sm)]" />
              <div className="h-2.5 w-48 rounded bg-[var(--alpha-bg-xs)]" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!entries.length) {
    return (
      <div className="text-center py-10 text-fg4 text-sm">
        Nenhuma atividade registrada.
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="absolute left-[5px] top-2 bottom-2 w-px bg-[var(--alpha-bg-sm)]" />

      <div className="space-y-4 pl-5">
        {entries.map(entry => {
          if (entry.kind === 'audit') {
            const log = entry.data
            const { label, detail } = describeAudit(log.acao, log.campo, log.valor_antes, log.valor_depois)
            const accent = getAuditAccent(log.acao)
            const Icon = getAuditIcon(log.acao)
            return (
              <div key={entry.id} className="relative">
                <div className={cn('absolute -left-5 top-1.5 w-2.5 h-2.5 rounded-full border-2 border-[rgba(10,18,35,1)]', accent.dot)} />
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Icon className={cn('w-3 h-3 shrink-0', accent.text)} />
                      <span className="text-sm font-medium text-fg2">{label}</span>
                    </div>
                    {detail && <p className="text-xs text-muted-foreground mt-0.5 ml-4.5">{detail}</p>}
                    {log.usuario && <p className="text-xs text-fg4 mt-0.5 ml-4.5">por {log.usuario}</p>}
                  </div>
                  <span className="text-xs text-fg4 shrink-0 pt-0.5">{formatDate(log.created_at)}</span>
                </div>
              </div>
            )
          }

          // interação
          const i = entry.data
          const accent = getChannelAccent(i.canal)
          const Icon = getChannelIcon(i.canal)
          const canalLabel = CANAL_LABELS[i.canal] ?? i.canal
          const stageLbl = MSG_STAGE_LABELS[i.stage_msg] ?? i.stage_msg
          const movedStatus = i.pipeline_antes && i.pipeline_depois && i.pipeline_antes !== i.pipeline_depois
          return (
            <div key={entry.id} className="relative">
              <div className={cn('absolute -left-5 top-1.5 w-2.5 h-2.5 rounded-full border-2 border-[rgba(10,18,35,1)]', accent.dot)} />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Icon className={cn('w-3 h-3 shrink-0', accent.text)} />
                    <span className="text-sm font-medium text-fg2">Mensagem enviada</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--alpha-bg-sm)', color: 'var(--text-soft-a)' }}>
                      {canalLabel}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--alpha-bg-sm)', color: 'var(--text-soft-a)' }}>
                      {stageLbl}
                    </span>
                  </div>
                  {i.assunto && (
                    <p className="text-xs text-fg2 mt-1 ml-4.5 font-medium">Assunto: {i.assunto}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 ml-4.5 line-clamp-2 whitespace-pre-wrap">
                    {i.corpo}
                  </p>
                  {movedStatus && (
                    <p className="text-xs mt-1 ml-4.5" style={{ color: 'var(--cyan-hi)' }}>
                      Pipeline: {getStageLabel(i.pipeline_antes!)} → {getStageLabel(i.pipeline_depois!)}
                    </p>
                  )}
                  {i.enviada_por && (
                    <p className="text-xs text-fg4 mt-0.5 ml-4.5">por {i.enviada_por}</p>
                  )}
                </div>
                <span className="text-xs text-fg4 shrink-0 pt-0.5">{formatDate(i.enviada_em)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
