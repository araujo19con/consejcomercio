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

const PRIORIDADE_CONFIG: Record<string, { bg: string; color: string; border: string }> = {
  alta:  { bg: 'rgba(239,68,68,0.15)',   color: '#f87171', border: 'rgba(239,68,68,0.30)' },
  media: { bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24', border: 'rgba(245,158,11,0.30)' },
  baixa: { bg: 'rgba(59,130,246,0.15)',  color: '#93c5fd', border: 'rgba(59,130,246,0.30)' },
}

export function DiagnosticPreview({ diagnostico, analise, onRedo }: Props) {
  const rec = getClusterRecommendation(diagnostico)
  const clusterInfo = CLUSTER_DESCRIPTIONS[rec.suggestedCluster]

  if (analise) {
    return (
      <div className="space-y-4">
        {/* Resumo */}
        <div className="rounded-xl p-4" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--emerald-hi)' }}>Perfil Jurídico</p>
          <p className="text-sm" style={{ color: 'var(--emerald-mid)' }}>{analise.resumo}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'rgba(0,137,172,0.15)', color: '#6bd0e7', border: '1px solid rgba(0,137,172,0.30)' }}>
              {clusterInfo?.label}
            </span>
            <span className="text-xs text-fg4">{clusterInfo?.price}</span>
          </div>
        </div>

        {/* Necessidades */}
        <div className="bg-card rounded-xl p-4" style={{ border: '1px solid var(--alpha-border)' }}>
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
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--amber-hi)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--amber-hi)' }}>Vulnerabilidades Jurídicas</h3>
          </div>
          <ul className="space-y-2">
            {analise.fraquezas.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--amber-mid)' }}>
                <span className="mt-1 w-1.5 h-1.5 flex-shrink-0 rounded-full" style={{ background: '#f97316' }} />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Serviços */}
        <div className="bg-card rounded-xl p-4" style={{ border: '1px solid var(--alpha-border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4" style={{ color: '#fbbf24' }} />
            <h3 className="text-sm font-semibold text-foreground">Serviços CONSEJ Recomendados</h3>
          </div>
          <div className="space-y-2">
            {analise.servicos_recomendados.map((s, i) => {
              const p = PRIORIDADE_CONFIG[s.prioridade] ?? PRIORIDADE_CONFIG.baixa
              return (
                <div key={i} className="p-3 rounded-lg" style={{ background: 'var(--alpha-bg-xs)', border: '1px solid var(--alpha-border)' }}>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-foreground">{s.nome}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full border font-medium" style={{ background: p.bg, color: p.color, borderColor: p.border }}>
                      {s.prioridade === 'alta' ? 'Alta' : s.prioridade === 'media' ? 'Média' : 'Baixa'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.justificativa}</p>
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

  // Fallback: cluster-based (no AI analysis stored)
  return (
    <Card style={{ borderColor: 'rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.06)' }}>
      <CardContent className="py-6">
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--emerald-hi)' }}>Cluster recomendado: <strong>{clusterInfo?.label}</strong></p>
        <p className="text-xs mb-4" style={{ color: 'var(--emerald-lo)' }}>{clusterInfo?.price}</p>
        {rec.rationale.length > 0 && (
          <div className="text-left rounded-lg p-3 mb-4" style={{ background: 'var(--alpha-bg-xs)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--emerald-hi)' }}>Análise:</p>
            {rec.rationale.map((r, i) => (
              <p key={i} className="text-xs mb-1" style={{ color: 'var(--emerald-mid)' }}>• {r}</p>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2 mb-4">
          {rec.urgentServices.map((s, i) => (
            <span key={i} className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.30)' }}>{s}</span>
          ))}
        </div>
        <Button variant="outline" onClick={onRedo} size="sm">Refazer diagnóstico</Button>
      </CardContent>
    </Card>
  )
}
