import { useLeads } from '@/hooks/useLeads'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { Stethoscope, Calendar, CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DiagnosticosPage() {
  const { data: leads, isLoading } = useLeads()
  const navigate = useNavigate()

  const withDiagnostico = leads?.filter(l => l.diagnostico?.completed_at) || []
  const pendentes = leads?.filter(l => l.status === 'levantamento_oportunidade' && !l.diagnostico?.completed_at) || []

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-6">Diagnósticos</h1>

      {pendentes.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Pendentes ({pendentes.length})
          </h2>
          <div className="space-y-2">
            {pendentes.map(lead => (
              <Card key={lead.id} className="border-amber-200 bg-amber-50/30">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">{lead.nome} — {lead.empresa}</p>
                    {lead.data_diagnostico && (
                      <p className="text-xs text-amber-700 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" /> Agendado para {formatDate(lead.data_diagnostico)}
                      </p>
                    )}
                  </div>
                  <Button size="sm" onClick={() => navigate(`/leads/${lead.id}`)} className="bg-amber-600 hover:bg-amber-700">
                    Realizar diagnóstico
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4" /> Concluídos ({withDiagnostico.length})
      </h2>
      {isLoading ? <div className="text-center text-slate-500 py-8">Carregando...</div> : (
        <div className="space-y-2">
          {withDiagnostico.map(lead => (
            <Card key={lead.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/leads/${lead.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">{lead.nome} — {lead.empresa}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Cluster: <span className="font-medium text-indigo-600">{lead.diagnostico?.cluster_recomendado || '—'}</span>
                      {' · '}Concluído em {formatDate(lead.diagnostico?.completed_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1 max-w-xs justify-end">
                    {lead.diagnostico?.servicos_urgentes?.slice(0, 2).map((s, i) => (
                      <span key={i} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">{s}</span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {withDiagnostico.length === 0 && <div className="text-center text-slate-400 py-8">Nenhum diagnóstico concluído.</div>}
        </div>
      )}
    </div>
  )
}
