import { useState } from 'react'
import { format, formatDistanceToNow, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Coins, Users, Package, TrendingUp, TrendingDown, ChevronDown, ChevronUp, X, Check, Truck, Ban, Clock } from 'lucide-react'
import { useMeuPerfil } from '@/hooks/usePerfis'
import {
  usePortalClientes, useAllResgates, useTransacoesCliente,
  useAtualizarResgate, useCreditarTokens, MOTIVOS_CREDITO,
  type PortalCliente,
} from '@/hooks/usePortalAdmin'
import { calcularNivel, NIVEL_CONFIG } from '@/types'

// ─── Nível badge ──────────────────────────────────────────────────────────────

function NivelBadge({ total }: { total: number }) {
  const nivel = calcularNivel(total)
  const cfg   = NIVEL_CONFIG[nivel]
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: `${cfg.cor}22`, color: cfg.cor, border: `1px solid ${cfg.cor}44` }}>
      {cfg.label}
    </span>
  )
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG = {
  pendente:  { label: 'Pendente',  bg: 'rgba(245,158,11,0.15)',  cor: '#f59e0b' },
  aprovado:  { label: 'Aprovado',  bg: 'rgba(34,197,94,0.12)',   cor: '#4ade80' },
  entregue:  { label: 'Entregue',  bg: 'rgba(34,197,94,0.15)',   cor: '#22c55e' },
  cancelado: { label: 'Cancelado', bg: 'rgba(239,68,68,0.12)',   cor: '#f87171' },
} as const

const MOTIVO_LABEL: Record<string, string> = {
  cadastro:         'Boas-vindas',
  indicacao:        'Indicação enviada',
  rd_realizada:     'Diagnóstico realizado',
  contrato_fechado: 'Contrato fechado',
  renovacao:        'Renovação',
  nps:              'Avaliação NPS',
  depoimento:       'Depoimento',
  evento:           'Evento CONSEJ',
  aniversario:      'Aniversário',
  bonus:            'Bônus especial',
  resgate:          'Resgate de recompensa',
}

// ─── Modal creditar tokens ────────────────────────────────────────────────────

function ModalCreditar({
  cliente,
  onClose,
}: {
  cliente: PortalCliente
  onClose: () => void
}) {
  const creditar = useCreditarTokens()
  const [motivo,    setMotivo]    = useState(MOTIVOS_CREDITO[0].value)
  const [valor,     setValor]     = useState('')
  const [descricao, setDescricao] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const n = parseInt(valor, 10)
    if (!n || n <= 0) return
    await creditar.mutateAsync({ perfilId: cliente.id, motivo, valor: n, descricao })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,8,29,0.85)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-2xl p-6"
        style={{ background: '#000d28', border: '1px solid rgba(107,208,231,0.2)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Creditar Tokens</p>
            <p style={{ fontSize: 12, color: 'rgba(107,208,231,0.5)' }}>{cliente.nome}</p>
          </div>
          <button onClick={onClose} style={{ color: 'rgba(107,208,231,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label style={{ fontSize: 11, color: 'rgba(107,208,231,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Motivo
            </label>
            <select
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              className="w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm"
              style={{ background: 'rgba(0,137,172,0.08)', border: '1px solid rgba(107,208,231,0.15)', color: '#fff', outline: 'none' }}
            >
              {MOTIVOS_CREDITO.map(m => (
                <option key={m.value} value={m.value} style={{ background: '#000d28' }}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'rgba(107,208,231,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Quantidade de tokens
            </label>
            <input
              type="number"
              min={1}
              value={valor}
              onChange={e => setValor(e.target.value)}
              placeholder="ex: 500"
              required
              className="w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm placeholder:opacity-30"
              style={{ background: 'rgba(0,137,172,0.08)', border: '1px solid rgba(107,208,231,0.15)', color: '#fff', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'rgba(107,208,231,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Descrição <span style={{ opacity: 0.4 }}>(opcional)</span>
            </label>
            <input
              type="text"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Detalhe adicional..."
              className="w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm placeholder:opacity-30"
              style={{ background: 'rgba(0,137,172,0.08)', border: '1px solid rgba(107,208,231,0.15)', color: '#fff', outline: 'none' }}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'transparent', border: '1px solid rgba(107,208,231,0.15)', color: 'rgba(107,208,231,0.5)', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={creditar.isPending}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #0089ac, #006d88)', cursor: 'pointer', border: 'none', opacity: creditar.isPending ? 0.6 : 1 }}>
              {creditar.isPending ? 'Creditando…' : `Creditar ${valor ? `+${valor}` : ''} tokens`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Linha de cliente expandível ─────────────────────────────────────────────

function ClienteRow({
  cliente,
  onCreditar,
}: {
  cliente: PortalCliente
  onCreditar: (c: PortalCliente) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { data: transacoes = [], isLoading } = useTransacoesCliente(expanded ? cliente.id : null)

  return (
    <>
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        style={{ borderBottom: '1px solid rgba(107,208,231,0.07)' }}
        onClick={() => setExpanded(v => !v)}
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
          style={{ background: 'rgba(0,137,172,0.2)', color: '#6bd0e7' }}>
          {cliente.nome.slice(0, 2).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 13, fontWeight: 600, color: '#fff' }} className="truncate">{cliente.nome}</p>
          <p style={{ fontSize: 11, color: 'rgba(107,208,231,0.4)' }} className="truncate">{cliente.email}</p>
        </div>

        {/* Nível */}
        <NivelBadge total={cliente.tokens_historico_total} />

        {/* Saldo */}
        <div className="text-right shrink-0" style={{ minWidth: 64 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#6bd0e7' }}>{cliente.tokens_saldo.toLocaleString('pt-BR')}</p>
          <p style={{ fontSize: 10, color: 'rgba(107,208,231,0.35)' }}>disponível</p>
        </div>

        {/* Histórico total */}
        <div className="text-right shrink-0" style={{ minWidth: 64 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(107,208,231,0.7)' }}>{cliente.tokens_historico_total.toLocaleString('pt-BR')}</p>
          <p style={{ fontSize: 10, color: 'rgba(107,208,231,0.35)' }}>acumulado</p>
        </div>

        {/* Ações */}
        <button
          onClick={e => { e.stopPropagation(); onCreditar(cliente) }}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0"
          style={{ background: 'rgba(0,137,172,0.2)', color: '#6bd0e7', border: '1px solid rgba(0,137,172,0.3)', cursor: 'pointer' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,137,172,0.35)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,137,172,0.2)' }}
        >
          + Creditar
        </button>

        {expanded ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: 'rgba(107,208,231,0.3)' }} /> : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'rgba(107,208,231,0.3)' }} />}
      </div>

      {/* Histórico expandido */}
      {expanded && (
        <div style={{ background: 'rgba(0,8,29,0.6)', borderBottom: '1px solid rgba(107,208,231,0.07)', padding: '0 16px 12px' }}>
          {isLoading ? (
            <p style={{ fontSize: 12, color: 'rgba(107,208,231,0.3)', padding: '12px 0' }}>Carregando histórico…</p>
          ) : transacoes.length === 0 ? (
            <p style={{ fontSize: 12, color: 'rgba(107,208,231,0.3)', padding: '12px 0' }}>Nenhuma movimentação ainda.</p>
          ) : (
            <div className="space-y-1 pt-2">
              {transacoes.slice(0, 10).map(tx => (
                <div key={tx.id} className="flex items-center gap-2 py-1.5">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: tx.tipo === 'credito' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)' }}>
                    {tx.tipo === 'credito'
                      ? <TrendingUp className="w-2.5 h-2.5 text-green-400" />
                      : <TrendingDown className="w-2.5 h-2.5 text-red-400" />}
                  </div>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', flex: 1 }} className="truncate">
                    {tx.descricao || MOTIVO_LABEL[tx.motivo] || tx.motivo}
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(107,208,231,0.35)' }}>
                    {format(new Date(tx.created_at), "dd/MM/yy HH:mm")}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: tx.tipo === 'credito' ? '#4ade80' : '#f87171', minWidth: 52, textAlign: 'right' }}>
                    {tx.tipo === 'credito' ? '+' : '-'}{tx.valor.toLocaleString('pt-BR')}
                  </span>
                </div>
              ))}
              {transacoes.length > 10 && (
                <p style={{ fontSize: 11, color: 'rgba(107,208,231,0.3)', paddingTop: 4 }}>
                  +{transacoes.length - 10} movimentações anteriores
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'clientes' | 'resgates'

export function PortalAdminPage() {
  const [tab, setTab]           = useState<Tab>('clientes')
  const [modalCliente, setModalCliente] = useState<PortalCliente | null>(null)

  const { data: perfil }          = useMeuPerfil()
  const { data: clientes = [], isLoading: loadingClientes } = usePortalClientes()
  const { data: resgates = [], isLoading: loadingResgates } = useAllResgates()
  const atualizarResgate          = useAtualizarResgate()

  const totalClientes   = clientes.length
  const totalPendentes  = resgates.filter(r => r.status === 'pendente').length
  const totalTokens     = clientes.reduce((s, c) => s + c.tokens_historico_total, 0)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(0,137,172,0.15)', border: '1px solid rgba(0,137,172,0.3)' }}>
          <Coins className="w-5 h-5" style={{ color: '#6bd0e7' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-strong-a)' }}>Portal — Administração</h1>
          <p style={{ fontSize: 12, color: 'rgba(107,208,231,0.5)' }}>Gerencie tokens e resgates dos clientes</p>
        </div>
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Clientes no portal', value: totalClientes, icon: Users,   cor: '#6bd0e7' },
          { label: 'Resgates pendentes', value: totalPendentes, icon: Package, cor: '#f59e0b' },
          { label: 'Tokens distribuídos', value: totalTokens.toLocaleString('pt-BR'), icon: Coins, cor: '#4ade80' },
        ].map(({ label, value, icon: Icon, cor }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: 'var(--alpha-bg-xs)', border: '1px solid rgba(107,208,231,0.1)' }}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4" style={{ color: cor }} />
              <span style={{ fontSize: 11, color: 'rgba(107,208,231,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
            </div>
            <p style={{ fontSize: 22, fontWeight: 700, color: cor }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {(['clientes', 'resgates'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: tab === t ? 'rgba(0,137,172,0.25)' : 'transparent',
              border: tab === t ? '1px solid rgba(0,137,172,0.5)' : '1px solid rgba(107,208,231,0.1)',
              color: tab === t ? '#6bd0e7' : 'rgba(107,208,231,0.4)',
              cursor: 'pointer',
            }}>
            {t === 'clientes' ? `Clientes (${totalClientes})` : `Resgates${totalPendentes > 0 ? ` · ${totalPendentes} pendentes` : ''}`}
          </button>
        ))}
      </div>

      {/* Tab: Clientes */}
      {tab === 'clientes' && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(107,208,231,0.1)' }}>
          {/* Cabeçalho da tabela */}
          <div className="flex items-center gap-3 px-4 py-2"
            style={{ background: 'rgba(0,137,172,0.06)', borderBottom: '1px solid rgba(107,208,231,0.1)' }}>
            <div style={{ width: 32 }} />
            <span style={{ flex: 1, fontSize: 10, color: 'rgba(107,208,231,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cliente</span>
            <span style={{ fontSize: 10, color: 'rgba(107,208,231,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', width: 70 }}>Nível</span>
            <span style={{ fontSize: 10, color: 'rgba(107,208,231,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', width: 80, textAlign: 'right' }}>Disponível</span>
            <span style={{ fontSize: 10, color: 'rgba(107,208,231,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', width: 80, textAlign: 'right' }}>Acumulado</span>
            <div style={{ width: 80 }} />
            <div style={{ width: 16 }} />
          </div>

          {loadingClientes ? (
            <div className="py-12 text-center" style={{ color: 'rgba(107,208,231,0.3)', fontSize: 13 }}>Carregando…</div>
          ) : clientes.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-8 h-8 mx-auto mb-3" style={{ color: 'rgba(107,208,231,0.2)' }} />
              <p style={{ color: 'rgba(107,208,231,0.4)', fontSize: 13 }}>Nenhum cliente convidado para o portal ainda.</p>
              <p style={{ color: 'rgba(107,208,231,0.25)', fontSize: 11, marginTop: 4 }}>Use "Convidar para Portal" na página de um cliente.</p>
            </div>
          ) : (
            clientes.map(c => (
              <ClienteRow key={c.id} cliente={c} onCreditar={setModalCliente} />
            ))
          )}
        </div>
      )}

      {/* Tab: Resgates */}
      {tab === 'resgates' && (
        <div className="space-y-2">
          {loadingResgates ? (
            <div className="py-12 text-center" style={{ color: 'rgba(107,208,231,0.3)', fontSize: 13 }}>Carregando…</div>
          ) : resgates.length === 0 ? (
            <div className="py-12 text-center rounded-xl" style={{ border: '1px solid rgba(107,208,231,0.08)', background: 'var(--alpha-bg-xs)' }}>
              <Package className="w-8 h-8 mx-auto mb-3" style={{ color: 'rgba(107,208,231,0.2)' }} />
              <p style={{ color: 'rgba(107,208,231,0.4)', fontSize: 13 }}>Nenhum resgate solicitado ainda.</p>
            </div>
          ) : (
            resgates.map(r => {
              const scfg = STATUS_CFG[r.status]
              return (
                <div key={r.id} className="rounded-xl px-4 py-3" style={(() => {
                    const dias = differenceInDays(new Date(), new Date(r.created_at))
                    const borderColor = r.status === 'pendente' && dias >= 7
                      ? 'rgba(239,68,68,0.4)'
                      : r.status === 'pendente' && dias >= 3
                        ? 'rgba(245,158,11,0.4)'
                        : 'rgba(107,208,231,0.08)'
                    return { background: 'var(--alpha-bg-xs)', border: `1px solid ${borderColor}` }
                  })()}>
                  <div className="flex items-start gap-3">
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                          {r.catalogo?.nome ?? 'Recompensa'}
                        </p>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: scfg.bg, color: scfg.cor }}>
                          {scfg.label}
                        </span>
                        {r.catalogo?.aprovacao_dupla && (
                          <span className="px-2 py-0.5 rounded-full text-xs"
                            style={{ background: 'rgba(129,140,248,0.1)', color: '#a5b4fc', border: '1px solid rgba(129,140,248,0.2)' }}>
                            Aprovação dupla
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: 'rgba(107,208,231,0.5)', marginTop: 2 }}>
                        {r.perfil?.nome ?? '—'} · {r.perfil?.email ?? '—'}
                      </p>
                      <p style={{ fontSize: 11, color: 'rgba(107,208,231,0.3)', marginTop: 1 }}>
                        {format(new Date(r.created_at), "d 'de' MMM 'de' yyyy, HH:mm", { locale: ptBR })}
                      </p>
                      {r.status === 'pendente' && (() => {
                        const dias = differenceInDays(new Date(), new Date(r.created_at))
                        const cor  = dias >= 7 ? '#f87171' : dias >= 3 ? '#f59e0b' : 'rgba(107,208,231,0.4)'
                        return (
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" style={{ color: cor }} />
                            <span style={{ fontSize: 11, color: cor }}>
                              {formatDistanceToNow(new Date(r.created_at), { locale: ptBR, addSuffix: true })}
                              {dias >= 3 && ' — requer atenção'}
                            </span>
                          </div>
                        )
                      })()}
                    </div>

                    {/* Tokens */}
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#f87171', flexShrink: 0 }}>
                      -{r.tokens_debitados.toLocaleString('pt-BR')}
                    </p>

                    {/* Ações */}
                    {r.status === 'pendente' && (
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => atualizarResgate.mutate({ id: r.id, status: 'aprovado', aprovadoPorId: perfil?.id ?? '' })}
                          title="Aprovar"
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', cursor: 'pointer' }}>
                          <Check className="w-3.5 h-3.5 text-green-400" />
                        </button>
                        <button
                          onClick={() => atualizarResgate.mutate({ id: r.id, status: 'cancelado', aprovadoPorId: perfil?.id ?? '' })}
                          title="Cancelar"
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}>
                          <Ban className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    )}
                    {r.status === 'aprovado' && (
                      <button
                        onClick={() => atualizarResgate.mutate({ id: r.id, status: 'entregue', aprovadoPorId: perfil?.id ?? '' })}
                        title="Marcar como entregue"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0"
                        style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80', cursor: 'pointer' }}>
                        <Truck className="w-3 h-3" /> Entregar
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Modal creditar */}
      {modalCliente && (
        <ModalCreditar cliente={modalCliente} onClose={() => setModalCliente(null)} />
      )}
    </div>
  )
}
