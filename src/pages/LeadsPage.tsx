import { useLeads } from '@/hooks/useLeads'
import { KanbanBoard } from '@/components/leads/KanbanBoard'

export function LeadsPage() {
  const { data: leads, isLoading } = useLeads()

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-slate-500">Carregando leads...</div>
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] gap-3">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Pipeline de Leads</h1>
        <p className="text-sm text-slate-500 mt-0.5">Arraste os cards entre as colunas para avançar leads no funil</p>
      </div>
      <div className="flex-1 min-h-0">
        <KanbanBoard leads={leads || []} />
      </div>
    </div>
  )
}
