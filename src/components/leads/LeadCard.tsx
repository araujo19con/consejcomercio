import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from 'react-router-dom'
import { differenceInDays } from 'date-fns'
import type { Lead } from '@/types'
import { LEAD_SOURCE_LABELS } from '@/lib/constants'
import { formatRelative } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Calendar, User, MessageCircle, Clock } from 'lucide-react'

const SEGMENT_COLORS: Record<string, { bg: string; color: string }> = {
  empresa_junior:        { bg: 'rgba(139,92,246,0.15)',  color: '#c4b5fd' },
  empresa_senior:        { bg: 'rgba(59,130,246,0.15)',  color: '#93c5fd' },
  startup:               { bg: 'rgba(16,185,129,0.15)',  color: '#6ee7b7' },
  escritorio_arquitetura:{ bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24' },
  empresa_design:        { bg: 'rgba(236,72,153,0.15)',  color: '#f9a8d4' },
  empresa_gestao:        { bg: 'rgba(6,182,212,0.15)',   color: '#67e8f9' },
  outro:                 { bg: 'var(--alpha-border)', color: 'var(--text-soft-a)' },
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

// Left border color per pipeline stage
const STAGE_ACCENT: Record<string, string> = {
  classificacao:             'rgba(56,189,248,0.85)',
  levantamento_oportunidade: 'rgba(99,130,246,0.85)',
  educar_lead:               'rgba(139,92,246,0.85)',
  proposta_comercial:        'rgba(245,158,11,0.85)',
  negociacao:                'rgba(249,115,22,0.85)',
  stand_by:                  'rgba(148,163,184,0.70)',
  ganho_assessoria:          'rgba(34,197,94,0.85)',
  ganho_consultoria:         'rgba(16,185,129,0.85)',
  perdido:                   'rgba(239,68,68,0.85)',
  cancelado:                 'rgba(244,63,94,0.85)',
}

// Subtle card background tint per stage
const STAGE_TINT: Record<string, string> = {
  classificacao:             'rgba(56,189,248,0.04)',
  levantamento_oportunidade: 'rgba(99,130,246,0.04)',
  educar_lead:               'rgba(139,92,246,0.05)',
  proposta_comercial:        'rgba(245,158,11,0.04)',
  negociacao:                'rgba(249,115,22,0.04)',
  stand_by:                  'var(--alpha-bg-xs)',
  ganho_assessoria:          'rgba(34,197,94,0.05)',
  ganho_consultoria:         'rgba(16,185,129,0.05)',
  perdido:                   'rgba(239,68,68,0.04)',
  cancelado:                 'rgba(244,63,94,0.04)',
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

type Props = { lead: Lead; isDragging?: boolean; stageId?: string }

export function LeadCard({ lead, isDragging = false, stageId }: Props) {
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

  const accentColor = isStagnant ? 'rgba(249,115,22,0.90)' : (STAGE_ACCENT[stageId ?? lead.status] ?? 'var(--alpha-bg-lg)')
  const tintBg     = isStagnant ? 'rgba(249,115,22,0.06)'  : (STAGE_TINT[stageId ?? lead.status]   ?? 'var(--alpha-bg-sm)')

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: tintBg,
        border: '1px solid var(--alpha-border)',
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: 8,
      }}
      {...attributes}
      {...listeners}
      className={cn(
        'rounded-lg p-3 mb-2 cursor-grab active:cursor-grabbing select-none transition-all',
        (isSortDragging || isDragging) && 'opacity-50 rotate-1',
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
          <p className="text-sm font-semibold text-foreground leading-tight truncate">{lead.nome}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{lead.empresa}</p>
        </div>
        {isStagnant && (
          <div
            title={`Parado há ${daysInStage} dias`}
            className="shrink-0 flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium"
            style={{ background: 'rgba(249,115,22,0.15)', color: '#fb923c' }}
          >
            <Clock className="w-2.5 h-2.5" />
            {daysInStage}d
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <span
          className="text-xs px-1.5 py-0.5 rounded-full font-medium"
          style={SEGMENT_COLORS[lead.segmento] ? { background: SEGMENT_COLORS[lead.segmento].bg, color: SEGMENT_COLORS[lead.segmento].color } : { background: 'var(--alpha-border)', color: 'var(--text-soft-a)' }}
        >
          {lead.segmento.replace(/_/g, ' ')}
        </span>
        <span className="text-xs text-fg4">
          {LEAD_SOURCE_LABELS[lead.origem] || lead.origem}
        </span>
      </div>

      <div className="flex items-center justify-between mt-2">
        {lead.data_diagnostico && (
          <div className="flex items-center gap-1 text-xs" style={{ color: '#a78bfa' }}>
            <Calendar className="w-3 h-3" />
            <span>{new Date(lead.data_diagnostico).toLocaleDateString('pt-BR')}</span>
          </div>
        )}
        {lead.responsavel && (
          <div className="flex items-center gap-1 text-xs text-fg4 ml-auto">
            <User className="w-3 h-3" />
            <span>{lead.responsavel}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-xs text-fg4">{formatRelative(lead.created_at)}</p>

        {/* Quick message button */}
        <button
          title="Gerar mensagem de abordagem"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); navigate(msgUrl) }}
          className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition-colors"
          style={{ color: 'var(--text-soft-a)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#6bd0e7'; (e.currentTarget as HTMLElement).style.background = 'rgba(0,137,172,0.12)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-soft-a)'; (e.currentTarget as HTMLElement).style.background = '' }}
        >
          <MessageCircle className="w-3 h-3" />
          mensagem
        </button>
      </div>
    </div>
  )
}
