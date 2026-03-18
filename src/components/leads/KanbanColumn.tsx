import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Lead } from '@/types'
import { LeadCard } from './LeadCard'
import { cn } from '@/lib/utils'

const COLUMN_COLORS: Record<string, string> = {
  classificacao:             'border-t-sky-400',
  levantamento_oportunidade: 'border-t-blue-500',
  educar_lead:               'border-t-violet-500',
  proposta_comercial:        'border-t-amber-500',
  negociacao:                'border-t-orange-500',
  stand_by:                  'border-t-slate-400',
  ganho_assessoria:          'border-t-green-500',
  ganho_consultoria:         'border-t-emerald-500',
  perdido:                   'border-t-red-500',
  cancelado:                 'border-t-rose-500',
}

type Props = {
  stageId: string
  label: string
  leads: Lead[]
}

export function KanbanColumn({ stageId, label, leads }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: stageId })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'w-64 shrink-0 flex flex-col rounded-xl border-t-2 bg-slate-100 transition-colors',
        COLUMN_COLORS[stageId] || 'border-t-slate-400',
        isOver && 'bg-indigo-50'
      )}
    >
      <div className="px-3 py-2.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</span>
        <span className="text-xs font-bold text-slate-400 bg-white rounded-full px-1.5 py-0.5 border">
          {leads.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-[200px]">
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map(lead => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}
