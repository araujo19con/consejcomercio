import { useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { PIPELINE_STAGES } from '@/lib/constants'
import { KanbanColumn } from './KanbanColumn'
import { LeadCard } from './LeadCard'
import { LostReasonModal } from './LostReasonModal'
import { ConvertToClientModal } from './ConvertToClientModal'
import { NewLeadModal } from './NewLeadModal'
import { NovaReuniaoModal } from '@/components/reunioes/NovaReuniaoModal'
import { useUpdateLeadStatus } from '@/hooks/useLeads'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { Lead } from '@/types'

type Props = { leads: Lead[] }

export function KanbanBoard({ leads }: Props) {
  const [activeCard, setActiveCard] = useState<Lead | null>(null)
  const [showNewLead, setShowNewLead] = useState(false)
  const [lostLead, setLostLead] = useState<{ id: string } | null>(null)
  const [convertLead, setConvertLead] = useState<Lead | null>(null)
  const [agendarLead, setAgendarLead] = useState<Lead | null>(null)
  const updateStatus = useUpdateLeadStatus()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // Group leads by stage
  const leadsByStage: Record<string, Lead[]> = {}
  for (const stage of PIPELINE_STAGES) {
    leadsByStage[stage.id] = leads.filter(l => l.status === stage.id)
  }

  function handleDragStart(event: DragStartEvent) {
    const found = leads.find(l => l.id === event.active.id)
    if (found) setActiveCard(found)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null)
    const { active, over } = event
    if (!over) return

    const leadId = active.id as string
    const newStage = over.id as string
    const lead = leads.find(l => l.id === leadId)
    if (!lead || lead.status === newStage) return

    if (newStage === 'perdido') {
      setLostLead({ id: leadId })
      return
    }
    if (newStage === 'contrato_assinado') {
      setConvertLead(lead)
      return
    }

    updateStatus.mutate({ id: leadId, status: newStage })

    if (newStage === 'diagnostico_agendado') {
      setAgendarLead(lead)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-800">Pipeline de Leads</h1>
        <Button size="sm" onClick={() => setShowNewLead(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-1" /> Novo Lead
        </Button>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4 h-full">
          {PIPELINE_STAGES.map(stage => (
            <KanbanColumn
              key={stage.id}
              stageId={stage.id}
              label={stage.label}
              leads={leadsByStage[stage.id] || []}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCard && <LeadCard lead={activeCard} isDragging />}
        </DragOverlay>
      </DndContext>

      {showNewLead && <NewLeadModal open={showNewLead} onClose={() => setShowNewLead(false)} />}

      <NovaReuniaoModal
        open={!!agendarLead}
        onClose={() => setAgendarLead(null)}
        prefill={agendarLead ? {
          titulo: `Diagnóstico — ${agendarLead.nome}${agendarLead.empresa ? ` (${agendarLead.empresa})` : ''}`,
        } : undefined}
      />

      {lostLead && (
        <LostReasonModal
          open={!!lostLead}
          onConfirm={(motivo) => {
            updateStatus.mutate({ id: lostLead.id, status: 'perdido', motivo_perda: motivo })
            setLostLead(null)
          }}
          onCancel={() => setLostLead(null)}
        />
      )}

      {convertLead && (
        <ConvertToClientModal
          lead={convertLead}
          open={!!convertLead}
          onClose={() => setConvertLead(null)}
        />
      )}
    </>
  )
}
