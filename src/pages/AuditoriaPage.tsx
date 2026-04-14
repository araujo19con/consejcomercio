import { useAuditLogs } from '@/hooks/useAuditLog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { ClipboardList } from 'lucide-react'

const ACAO_COLORS: Record<string, { bg: string; color: string }> = {
  criado:              { bg: 'rgba(16,185,129,0.15)',  color: '#34d399' },
  atualizado:          { bg: 'rgba(59,130,246,0.15)',  color: '#93c5fd' },
  excluido:            { bg: 'rgba(239,68,68,0.15)',   color: '#f87171' },
  status_alterado:     { bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24' },
  convertido:          { bg: 'rgba(0,137,172,0.15)',   color: '#6bd0e7' },
  recompensa_entregue: { bg: 'rgba(139,92,246,0.15)',  color: '#a78bfa' },
}

export function AuditoriaPage() {
  const { data: logs, isLoading } = useAuditLogs()

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-6">Auditoria</h1>

      {isLoading ? <div className="text-center text-muted-foreground py-8">Carregando...</div> : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Log de atividades (últimas {logs?.length || 0} entradas)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {logs?.map(log => (
                <div key={log.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-28 shrink-0">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={ACAO_COLORS[log.acao]
                        ? { background: ACAO_COLORS[log.acao].bg, color: ACAO_COLORS[log.acao].color }
                        : { background: 'rgba(255,255,255,0.04)', color: 'rgba(150,165,180,0.70)' }}
                    >
                      {log.acao}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-fg2">
                      <span className="font-medium capitalize">{log.tabela.replace(/_/g, ' ')}</span>
                      {log.campo && <span className="text-fg4"> · {log.campo}</span>}
                    </p>
                    {log.usuario && <p className="text-xs text-fg4">{log.usuario}</p>}
                  </div>
                  <p className="text-xs text-fg4 shrink-0">{formatDate(log.created_at)}</p>
                </div>
              ))}
              {!logs?.length && (
                <div className="text-center text-fg4 py-12">Nenhuma atividade registrada.</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
