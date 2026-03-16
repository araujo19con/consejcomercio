import { Button } from '@/components/ui/button'
import { CheckCircle2, AlertTriangle, Target, Lightbulb, RotateCcw } from 'lucide-react'
import type { AnaliseIA } from '@/hooks/useAnalyzeDiagnostico'

type Props = {
  analise: AnaliseIA
  onRedo: () => void
}

const PRIORIDADE_CONFIG = {
  alta: { label: 'Prioridade Alta', className: 'bg-red-100 text-red-700 border-red-200' },
  media: { label: 'Prioridade Média', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  baixa: { label: 'Prioridade Baixa', className: 'bg-blue-100 text-blue-700 border-blue-200' },
}

export function DiagnosticResult({ analise, onRedo }: Props) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
        <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
        <h2 className="text-base font-bold text-green-900 mb-1">Diagnóstico Concluído</h2>
        <p className="text-sm text-green-700">{analise.resumo}</p>
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

      {/* Serviços recomendados */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4 text-yellow-600" />
          <h3 className="text-sm font-semibold text-slate-800">Serviços CONSEJ Recomendados</h3>
        </div>
        <div className="space-y-3">
          {analise.servicos_recomendados.map((s, i) => {
            const cfg = PRIORIDADE_CONFIG[s.prioridade]
            return (
              <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-slate-800">{s.nome}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.className}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{s.justificativa}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Button variant="outline" size="sm" onClick={onRedo} className="w-full gap-2">
        <RotateCcw className="w-3.5 h-3.5" />
        Refazer Diagnóstico
      </Button>
    </div>
  )
}
