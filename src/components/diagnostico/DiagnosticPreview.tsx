import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Lightbulb, Target, RotateCcw } from 'lucide-react'
import { getClusterRecommendation, CLUSTER_DESCRIPTIONS } from '@/lib/diagnostic-utils'
import type { Diagnostico } from '@/types'
import type { AnaliseIA } from '@/hooks/useAnalyzeDiagnostico'

type Props = {
  diagnostico: Diagnostico
  analise?: AnaliseIA | null
  onRedo: () => void
}

const PRIORIDADE_CONFIG = {
  alta: 'bg-red-100 text-red-700 border-red-200',
  media: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  baixa: 'bg-blue-100 text-blue-700 border-blue-200',
}

export function DiagnosticPreview({ diagnostico, analise, onRedo }: Props) {
  const rec = getClusterRecommendation(diagnostico)
  const clusterInfo = CLUSTER_DESCRIPTIONS[rec.suggestedCluster]

  if (analise) {
    return (
      <div className="space-y-4">
        {/* Resumo */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-green-800 mb-1">Perfil Jurídico</p>
          <p className="text-sm text-green-700">{analise.resumo}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-medium border border-indigo-200">
              {clusterInfo?.label}
            </span>
            <span className="text-xs text-slate-400">{clusterInfo?.price}</span>
          </div>
        </div>

        {/* Necessidades */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-semibold text-slate-800">Necessidades Identificadas</h3>
          </div>
          <ul className="space-y-2">
            {analise.necessidades.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-0.5 w-5 h-5 flex-shrink-0 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Fraquezas */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <h3 className="text-sm font-semibold text-orange-800">Vulnerabilidades Jurídicas</h3>
          </div>
          <ul className="space-y-2">
            {analise.fraquezas.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-orange-700">
                <span className="mt-1 w-1.5 h-1.5 flex-shrink-0 bg-orange-500 rounded-full" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Serviços */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-yellow-600" />
            <h3 className="text-sm font-semibold text-slate-800">Serviços CONSEJ Recomendados</h3>
          </div>
          <div className="space-y-2">
            {analise.servicos_recomendados.map((s, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-semibold text-slate-800">{s.nome}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORIDADE_CONFIG[s.prioridade]}`}>
                    {s.prioridade === 'alta' ? 'Alta' : s.prioridade === 'media' ? 'Média' : 'Baixa'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{s.justificativa}</p>
              </div>
            ))}
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={onRedo} className="w-full gap-2">
          <RotateCcw className="w-3.5 h-3.5" />
          Refazer Diagnóstico
        </Button>
      </div>
    )
  }

  // Fallback: cluster-based (no AI analysis stored)
  return (
    <Card className="border-green-200 bg-green-50">
      <CardContent className="py-6">
        <p className="text-sm font-semibold text-green-800 mb-1">Cluster recomendado: <strong>{clusterInfo?.label}</strong></p>
        <p className="text-xs text-green-600 mb-4">{clusterInfo?.price}</p>
        {rec.rationale.length > 0 && (
          <div className="text-left bg-white rounded-lg p-3 mb-4 border border-green-100">
            <p className="text-xs font-semibold text-green-800 mb-2">Análise:</p>
            {rec.rationale.map((r, i) => (
              <p key={i} className="text-xs text-green-700 mb-1">• {r}</p>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2 mb-4">
          {rec.urgentServices.map((s, i) => (
            <span key={i} className="text-xs bg-green-100 text-green-800 px-2.5 py-1 rounded-full border border-green-200">{s}</span>
          ))}
        </div>
        <Button variant="outline" onClick={onRedo} size="sm">Refazer diagnóstico</Button>
      </CardContent>
    </Card>
  )
}
