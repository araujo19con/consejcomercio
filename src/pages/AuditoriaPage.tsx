import { useAuditLogs } from '@/hooks/useAuditLog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'

const ACAO_COLORS: Record<string, string> = {
  criado: 'bg-green-100 text-green-700',
  atualizado: 'bg-blue-100 text-blue-700',
  excluido: 'bg-red-100 text-red-700',
  status_alterado: 'bg-amber-100 text-amber-700',
  convertido: 'bg-indigo-100 text-indigo-700',
  recompensa_entregue: 'bg-purple-100 text-purple-700',
}

export function AuditoriaPage() {
  const { data: logs, isLoading } = useAuditLogs()

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-6">Auditoria</h1>

      {isLoading ? <div className="text-center text-slate-500 py-8">Carregando...</div> : (
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
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', ACAO_COLORS[log.acao] || 'bg-slate-100 text-slate-600')}>
                      {log.acao}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">
                      <span className="font-medium capitalize">{log.tabela.replace(/_/g, ' ')}</span>
                      {log.campo && <span className="text-slate-400"> · {log.campo}</span>}
                    </p>
                    {log.usuario && <p className="text-xs text-slate-400">{log.usuario}</p>}
                  </div>
                  <p className="text-xs text-slate-400 shrink-0">{formatDate(log.created_at)}</p>
                </div>
              ))}
              {!logs?.length && (
                <div className="text-center text-slate-400 py-12">Nenhuma atividade registrada.</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
