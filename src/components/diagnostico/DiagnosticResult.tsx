import { Button } from '@/components/ui/button'
import { CheckCircle2, AlertTriangle, Target, Lightbulb, RotateCcw } from 'lucide-react'
import type { AnaliseIA } from '@/hooks/useAnalyzeDiagnostico'

type Props = {
  analise: AnaliseIA
  onRedo: () => void
}

const PRIORIDADE_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  alta:  { label: 'Prioridade Alta',  bg: 'rgba(239,68,68,0.15)',  color: '#f87171', border: 'rgba(239,68,68,0.30)' },
  media: { label: 'Prioridade Média', bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: 'rgba(245,158,11,0.30)' },
  baixa: { label: 'Prioridade Baixa', bg: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: 'rgba(59,130,246,0.30)' },
}

export function DiagnosticResult({ analise, onRedo }: Props) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl p-5 text-center" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)' }}>
        <CheckCircle2 className="w-10 h-10 mx-auto mb-2" style={{ color: '#34d399' }} />
        <h2 className="text-base font-bold mb-1" style={{ color: 'rgba(52,211,153,0.90)' }}>Diagnóstico Concluído</h2>
        <p className="text-sm" style={{ color: 'rgba(52,211,153,0.75)' }}>{analise.resumo}</p>
      </div>

      {/* Necessidades */}
      <div className="bg-card rounded-xl p-4" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4" style={{ color: '#6bd0e7' }} />
          <h3 className="text-sm font-semibold text-foreground">Necessidades Identificadas</h3>
        </div>
        <ul className="space-y-2">
          {analise.necessidades.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-fg2">
              <span className="mt-0.5 w-5 h-5 flex-shrink-0 rounded-full text-xs font-bold flex items-center justify-center" style={{ background: 'rgba(0,137,172,0.20)', color: '#6bd0e7' }}>
                {i + 1}
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Fraquezas */}
      <div className="rounded-xl p-4" style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.25)' }}>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4" style={{ color: 'rgba(251,191,36,0.85)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'rgba(251,191,36,0.85)' }}>Vulnerabilidades Jurídicas</h3>
        </div>
        <ul className="space-y-2">
          {analise.fraquezas.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'rgba(251,191,36,0.75)' }}>
              <span className="mt-1 w-1.5 h-1.5 flex-shrink-0 rounded-full" style={{ background: '#f97316' }} />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Serviços recomendados */}
      <div className="bg-card rounded-xl p-4" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4" style={{ color: '#fbbf24' }} />
          <h3 className="text-sm font-semibold text-foreground">Serviços CONSEJ Recomendados</h3>
        </div>
        <div className="space-y-3">
          {analise.servicos_recomendados.map((s, i) => {
            const cfg = PRIORIDADE_CONFIG[s.prioridade] ?? PRIORIDADE_CONFIG.baixa
            return (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-foreground">{s.nome}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full border font-medium" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.justificativa}</p>
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
