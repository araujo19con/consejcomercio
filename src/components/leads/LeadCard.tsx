import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from 'react-router-dom'
import type { Lead } from '@/types'
import { LEAD_SOURCE_LABELS } from '@/lib/constants'
import { formatRelative } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Calendar, User } from 'lucide-react'

const SEGMENT_COLORS: Record<string, string> = {
  empresa_junior: 'bg-violet-100 text-violet-700',
  empresa_senior: 'bg-blue-100 text-blue-700',
  startup: 'bg-emerald-100 text-emerald-700',
  escritorio_arquitetura: 'bg-amber-100 text-amber-700',
  empresa_design: 'bg-pink-100 text-pink-700',
  empresa_gestao: 'bg-cyan-100 text-cyan-700',
  outro: 'bg-slate-100 text-slate-600',
}

type Props = { lead: Lead; isDragging?: boolean }

export function LeadCard({ lead, isDragging = false }: Props) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortDragging } = useSortable({ id: lead.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'bg-white rounded-lg border border-slate-200 p-3 mb-2 cursor-grab active:cursor-grabbing select-none shadow-sm hover:shadow-md transition-shadow',
        (isSortDragging || isDragging) && 'opacity-50 shadow-xl rotate-1'
      )}
      onClick={(e) => {
        // Only navigate if not dragging
        if (!isSortDragging) {
          e.stopPropagation()
          navigate(`/leads/${lead.id}`)
        }
      }}
    >
      <p className="text-sm font-semibold text-slate-800 leading-tight">{lead.nome}</p>
      <p className="text-xs text-slate-500 mt-0.5">{lead.empresa}</p>

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

      <p className="text-xs text-slate-300 mt-1.5">{formatRelative(lead.created_at)}</p>
    </div>
  )
}
