import { useState } from 'react'
import { useTokenTransacoes, useResgates } from '@/hooks/usePortal'
import { ClipboardList, TrendingUp, TrendingDown, Package } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const MOTIVO_LABEL: Record<string, string> = {
  cadastro:           'Boas-vindas ao programa',
  indicacao:          'Indicação enviada',
  rd_realizada:       'Diagnóstico realizado pelo indicado',
  contrato_fechado:   'Contrato fechado pelo indicado',
  renovacao:          'Renovação de contrato',
  nps:                'Avaliação NPS',
  depoimento:         'Depoimento em vídeo/case',
  evento:             'Participação em evento CONSEJ',
  aniversario:        'Aniversário do cliente',
  bonus:              'Bônus especial',
  resgate:            'Resgate de recompensa',
}

const STATUS_CONFIG = {
  pendente:  { label: 'Pendente',   bg: 'rgba(245,158,11,0.15)',  cor: '#f59e0b' },
  aprovado:  { label: 'Aprovado',   bg: 'rgba(34,197,94,0.12)',   cor: '#4ade80' },
  entregue:  { label: 'Entregue',   bg: 'rgba(34,197,94,0.15)',   cor: '#22c55e' },
  cancelado: { label: 'Cancelado',  bg: 'rgba(239,68,68,0.12)',   cor: '#f87171' },
}

type FiltroTx = 'todos' | 'creditos' | 'debitos'

export function PortalHistoricoPage() {
  const { data: transacoes = [], isLoading: loadingTx } = useTokenTransacoes()
  const { data: resgates = [], isLoading: loadingRs } = useResgates()
  const [filtro, setFiltro] = useState<FiltroTx>('todos')

  const txFiltradas = transacoes.filter(tx => {
    if (filtro === 'creditos') return tx.tipo === 'credito'
    if (filtro === 'debitos') return tx.tipo === 'debito'
    return true
  })

  const totalCreditos = transacoes.filter(t => t.tipo === 'credito').reduce((s, t) => s + t.valor, 0)
  const totalDebitos  = transacoes.filter(t => t.tipo === 'debito').reduce((s, t) => s + t.valor, 0)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(0,137,172,0.15)', border: '1px solid rgba(0,137,172,0.3)' }}>
          <ClipboardList className="w-5 h-5" style={{ color: '#6bd0e7' }} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>Histórico</h1>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-xl p-4" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span style={{ fontSize: 11, color: 'rgba(34,197,94,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total ganho</span>
          </div>
          <p style={{ fontSize: 22, fontWeight: 700, color: '#4ade80' }}>
            +{totalCreditos.toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span style={{ fontSize: 11, color: 'rgba(239,68,68,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total resgatado</span>
          </div>
          <p style={{ fontSize: 22, fontWeight: 700, color: '#f87171' }}>
            -{totalDebitos.toLocaleString('pt-BR')}
          </p>
        </div>
      </div>

      {/* Transações */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'rgba(107,208,231,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Movimentações
          </h2>
          <div className="flex gap-1">
            {(['todos', 'creditos', 'debitos'] as FiltroTx[]).map(f => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 20, cursor: 'pointer',
                  background: filtro === f ? 'rgba(0,137,172,0.3)' : 'transparent',
                  border: filtro === f ? '1px solid rgba(0,137,172,0.5)' : '1px solid rgba(107,208,231,0.15)',
                  color: filtro === f ? '#6bd0e7' : 'rgba(107,208,231,0.4)',
                  transition: 'all 0.15s',
                }}
              >
                {f === 'todos' ? 'Todos' : f === 'creditos' ? 'Créditos' : 'Débitos'}
              </button>
            ))}
          </div>
        </div>

        {loadingTx ? (
          <div className="py-10 text-center" style={{ color: 'rgba(107,208,231,0.3)', fontSize: 13 }}>Carregando...</div>
        ) : txFiltradas.length === 0 ? (
          <div className="py-12 text-center">
            <ClipboardList className="w-8 h-8 mx-auto mb-3" style={{ color: 'rgba(107,208,231,0.2)' }} />
            <p style={{ color: 'rgba(107,208,231,0.4)', fontSize: 13 }}>Nenhuma movimentação encontrada.</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(107,208,231,0.1)' }}>
            {txFiltradas.map((tx, i) => (
              <div key={tx.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  borderBottom: i < txFiltradas.length - 1 ? '1px solid rgba(107,208,231,0.07)' : 'none',
                  background: i % 2 === 0 ? 'rgba(0,8,29,0.5)' : 'rgba(0,8,29,0.3)',
                }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: tx.tipo === 'credito' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)' }}>
                  {tx.tipo === 'credito'
                    ? <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                    : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 13, color: '#fff' }} className="truncate">
                    {tx.descricao || MOTIVO_LABEL[tx.motivo] || tx.motivo}
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(107,208,231,0.4)' }}>
                    {format(new Date(tx.created_at), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <span style={{
                  fontSize: 14, fontWeight: 700, minWidth: 60, textAlign: 'right',
                  color: tx.tipo === 'credito' ? '#4ade80' : '#f87171',
                }}>
                  {tx.tipo === 'credito' ? '+' : '-'}{tx.valor.toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resgates */}
      <div>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'rgba(107,208,231,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Meus Resgates
        </h2>

        {loadingRs ? (
          <div className="py-6 text-center" style={{ color: 'rgba(107,208,231,0.3)', fontSize: 13 }}>Carregando...</div>
        ) : resgates.length === 0 ? (
          <div className="py-10 text-center rounded-xl" style={{ border: '1px solid rgba(107,208,231,0.08)', background: 'rgba(0,8,29,0.3)' }}>
            <Package className="w-8 h-8 mx-auto mb-3" style={{ color: 'rgba(107,208,231,0.2)' }} />
            <p style={{ color: 'rgba(107,208,231,0.4)', fontSize: 13 }}>Nenhum resgate solicitado ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {resgates.map(r => {
              const statusCfg = STATUS_CONFIG[r.status]
              return (
                <div key={r.id}
                  className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: 'rgba(0,8,29,0.5)', border: '1px solid rgba(107,208,231,0.08)' }}>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#fff' }} className="truncate">
                      {r.catalogo?.nome ?? 'Recompensa'}
                    </p>
                    <p style={{ fontSize: 11, color: 'rgba(107,208,231,0.4)' }}>
                      {format(new Date(r.created_at), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#f87171', marginRight: 8 }}>
                    -{r.tokens_debitados.toLocaleString('pt-BR')}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold shrink-0"
                    style={{ background: statusCfg.bg, color: statusCfg.cor }}>
                    {statusCfg.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
