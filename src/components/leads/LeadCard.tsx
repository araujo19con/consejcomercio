import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from 'react-router-dom'
import { differenceInDays } from 'date-fns'
import type { Lead } from '@/types'
import { LEAD_SOURCE_LABELS } from '@/lib/constants'
import { formatRelative } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Calendar, User, MessageCircle, Clock } from 'lucide-react'

const SEGMENT_COLORS: Record<string, string> = {
  empresa_junior: 'bg-violet-100 text-violet-700',
  empresa_senior: 'bg-blue-100 text-blue-700',
  startup: 'bg-emerald-100 text-emerald-700',
  escritorio_arquitetura: 'bg-amber-100 text-amber-700',
  empresa_design: 'bg-pink-100 text-pink-700',
  empresa_gestao: 'bg-cyan-100 text-cyan-700',
  outro: 'bg-slate-100 text-slate-600',
}

// Map pipeline stage → mensagens page stage
const STAGE_TO_MSG: Record<string, string> = {
  classificacao:             'primeiro_contato',
  levantamento_oportunidade: 'diagnostico',
  educar_lead:               'followup',
  proposta_comercial:        'proposta',
  negociacao:                'negociacao',
  stand_by:                  'followup',
}

// Stagnant thresholds in days per stage
const STAGNANT_DAYS: Record<string, number> = {
  classificacao:             3,
  levantamento_oportunidade: 5,
  educar_lead:               7,
  proposta_comercial:        7,
  negociacao:                10,
  stand_by:                  14,
}

type Props = { lead: Lead; isDragging?: boolean }

export function LeadCard({ lead, isDragging = false }: Props) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortDragging } = useSortable({ id: lead.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Stagnant check
  const daysInStage = differenceInDays(new Date(), new Date(lead.updated_at))
  const threshold = STAGNANT_DAYS[lead.status] ?? 7
  const isStagnant = daysInStage >= threshold && !(lead.status in { ganho_assessoria: 1, ganho_consultoria: 1, perdido: 1, cancelado: 1 })

  // Message shortcut URL
  const msgStage = STAGE_TO_MSG[lead.status] ?? 'primeiro_contato'
  const msgUrl = `/mensagens?nome=${encodeURIComponent(lead.nome)}&empresa=${encodeURIComponent(lead.empresa ?? '')}&stage=${msgStage}`

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'bg-white rounded-lg border border-slate-200 p-3 mb-2 cursor-grab active:cursor-grabbing select-none shadow-sm hover:shadow-md transition-shadow',
        (isSortDragging || isDragging) && 'opacity-50 shadow-xl rotate-1',
        isStagnant && 'border-l-2 border-l-orange-400'
      )}
      onClick={(e) => {
        if (!isSortDragging) {
          e.stopPropagation()
          navigate(`/leads/${lead.id}`)
        }
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 leading-tight truncate">{lead.nome}</p>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{lead.empresa}</p>
        </div>
        {isStagnant && (
          <div
            title={`Parado há ${daysInStage} dias`}
            className="shrink-0 flex items-center gap-0.5 bg-orange-50 text-orange-500 rounded px-1 py-0.5 text-[10px] font-medium"
          >
            <Clock className="w-2.5 h-2.5" />
            {daysInStage}d
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', SEGMENT_COLORS[lead.segmento] || 'bg-slate-100 text-slate-600')}>
          {lead.segmento.replace(/_/g, ' ')}
        </span>
        <span className="text-xs text-slate-400">
          {LEAD_SOURCE_LABELS[lead.origem] || lead.origem}
        </span>
      </div>

      <div className="flex items-center justify-between mt-2">
        {lead.data_diagnostico && (
          <div className="flex items-center gap-1 text-xs text-violet-600">
            <Calendar className="w-3 h-3" />
            <span>{new Date(lead.data_diagnostico).toLocaleDateString('pt-BR')}</span>
          </div>
        )}
        {lead.responsavel && (
          <div className="flex items-center gap-1 text-xs text-slate-400 ml-auto">
            <User className="w-3 h-3" />
            <span>{lead.responsavel}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-xs text-slate-300">{formatRelative(lead.created_at)}</p>

        {/* Quick message button */}
        <button
          title="Gerar mensagem de abordagem"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); navigate(msgUrl) }}
          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 px-1.5 py-0.5 rounded transition-colors"
        >
          <MessageCircle className="w-3 h-3" />
          mensagem
        </button>
      </div>
    </div>
  )
}
