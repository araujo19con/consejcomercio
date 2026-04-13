import { useAuditLogs } from '@/hooks/useAuditLogs'
import { PIPELINE_STAGES, CLIENT_STATUS_OPTIONS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { GitCommitHorizontal, UserCheck, Edit3, Plus, ArrowRight } from 'lucide-react'

type Props = {
  tabela: 'leads' | 'clientes' | 'contratos'
  registroId: string
}

function getStageLabel(status: string) {
  return (
    PIPELINE_STAGES.find(s => s.id === status)?.label ??
    CLIENT_STATUS_OPTIONS.find(s => s.value === status)?.label ??
    status
  )
}

function describeEntry(acao: string, campo: string | null | undefined, valorAntes: Record<string, unknown> | null | undefined, valorDepois: Record<string, unknown> | null | undefined) {
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

function getIcon(acao: string) {
  if (acao === 'criado') return Plus
  if (acao === 'status_alterado') return ArrowRight
  if (acao === 'convertido') return UserCheck
  return Edit3
}

function getAccent(acao: string) {
  if (acao === 'criado') return { dot: 'bg-emerald-500', text: 'text-emerald-400' }
  if (acao === 'status_alterado') return { dot: 'bg-[#0089ac]', text: 'text-[#6bd0e7]' }
  if (acao === 'convertido') return { dot: 'bg-violet-500', text: 'text-violet-400' }
  return { dot: 'bg-[rgba(130,150,170,0.4)]', text: 'text-[rgba(130,150,170,0.65)]' }
}

export function ActivityTimeline({ tabela, registroId }: Props) {
  const { data: logs, isLoading } = useAuditLogs(tabela, registroId)

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-[rgba(255,255,255,0.08)] mt-1.5 shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-32 rounded bg-[rgba(255,255,255,0.05)]" />
              <div className="h-2.5 w-48 rounded bg-[rgba(255,255,255,0.04)]" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!logs?.length) {
    return (
      <div className="text-center py-10 text-[rgba(100,120,140,0.55)] text-sm">
        Nenhuma atividade registrada.
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[5px] top-2 bottom-2 w-px bg-[rgba(255,255,255,0.06)]" />

      <div className="space-y-4 pl-5">
        {logs.map((log, idx) => {
          const { label, detail } = describeEntry(log.acao, log.campo, log.valor_antes, log.valor_depois)
          const accent = getAccent(log.acao)
          const Icon = getIcon(log.acao)

          return (
            <div key={log.id} className="relative">
              {/* Dot */}
              <div className={cn('absolute -left-5 top-1.5 w-2.5 h-2.5 rounded-full border-2 border-[rgba(10,18,35,1)]', accent.dot)} />

              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Icon className={cn('w-3 h-3 shrink-0', accent.text)} />
                    <span className="text-sm font-medium text-[rgba(215,225,235,0.85)]">{label}</span>
                  </div>
                  {detail && (
                    <p className="text-xs text-[rgba(130,150,170,0.65)] mt-0.5 ml-4.5">{detail}</p>
                  )}
                  {log.usuario && (
                    <p className="text-xs text-[rgba(100,120,140,0.45)] mt-0.5 ml-4.5">por {log.usuario}</p>
                  )}
                </div>
                <span className="text-xs text-[rgba(100,120,140,0.45)] shrink-0 pt-0.5">
                  {formatDate(log.created_at)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
