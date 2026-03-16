import { useLeads } from '@/hooks/useLeads'
import { KanbanBoard } from '@/components/leads/KanbanBoard'

export function LeadsPage() {
  const { data: leads, isLoading } = useLeads()

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-slate-500">Carregando leads...</div>
  }

  return (
    <div className="h-[calc(100vh-7rem)]">
      <KanbanBoard leads={leads || []} />
    </div>
  )
}
