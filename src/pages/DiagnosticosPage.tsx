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
      <h1 className="text-xl font-bold text-[rgba(230,235,240,0.92)] mb-6">Diagnósticos</h1>

      {pendentes.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'rgba(251,191,36,0.85)' }}>
            <Clock className="w-4 h-4" /> Pendentes ({pendentes.length})
          </h2>
          <div className="space-y-2">
            {pendentes.map(lead => (
              <Card key={lead.id} style={{ borderColor: 'rgba(245,158,11,0.30)', background: 'rgba(245,158,11,0.04)' }}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold" style={{ color: 'rgba(230,235,240,0.92)' }}>{lead.nome} — {lead.empresa}</p>
                    {lead.data_diagnostico && (
                      <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'rgba(251,191,36,0.75)' }}>
                        <Calendar className="w-3 h-3" /> Agendado para {formatDate(lead.data_diagnostico)}
                      </p>
                    )}
                  </div>
                  <Button size="sm" onClick={() => navigate(`/leads/${lead.id}`)} className="text-white" style={{ background: 'linear-gradient(135deg, #0089ac, #006d88)', border: 'none' }}>
                    Realizar diagnóstico
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'rgba(52,211,153,0.85)' }}>
        <CheckCircle2 className="w-4 h-4" /> Concluídos ({withDiagnostico.length})
      </h2>
      {isLoading ? <div className="text-center text-[rgba(130,150,170,0.65)] py-8">Carregando...</div> : (
        <div className="space-y-2">
          {withDiagnostico.map(lead => (
            <Card key={lead.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/leads/${lead.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-[rgba(230,235,240,0.92)]">{lead.nome} — {lead.empresa}</p>
                    <p className="text-xs text-[rgba(130,150,170,0.65)] mt-0.5">
                      Cluster: <span className="font-medium text-[#a5b4fc]">{lead.diagnostico?.cluster_recomendado || '—'}</span>
                      {' · '}Concluído em {formatDate(lead.diagnostico?.completed_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1 max-w-xs justify-end">
                    {lead.diagnostico?.servicos_urgentes?.slice(0, 2).map((s, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {withDiagnostico.length === 0 && <div className="text-center text-[rgba(100,120,140,0.55)] py-8">Nenhum diagnóstico concluído.</div>}
        </div>
      )}
    </div>
  )
}
