import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePortalPerfil, useTokenTransacoes } from '@/hooks/usePortal'
import { calcularNivel, NIVEL_CONFIG } from '@/types'
import { Coins, UserPlus, TrendingUp, TrendingDown, Target, ChevronRight, X, Gift, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

// ─── Modal de boas-vindas ─────────────────────────────────────────────────────

function WelcomeModal({ nome, onClose }: { nome: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,8,29,0.88)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: '#000d28', border: '1px solid rgba(0,137,172,0.3)', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>

        {/* Banner topo */}
        <div className="px-6 pt-8 pb-5 text-center"
          style={{ background: 'linear-gradient(160deg, rgba(0,137,172,0.18) 0%, rgba(0,8,29,0) 100%)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(0,137,172,0.2)', border: '1px solid rgba(0,137,172,0.35)' }}>
            <Coins className="w-8 h-8" style={{ color: '#6bd0e7' }} />
          </div>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            Bem-vindo, {nome.split(' ')[0]}!
          </p>
          <p style={{ fontSize: 13, color: 'rgba(107,208,231,0.65)', lineHeight: 1.6 }}>
            Você acaba de entrar no programa de indicações CONSEJ.<br />
            Indique empresas, acumule tokens e troque por recompensas.
          </p>
        </div>

        {/* Tabela de ganhos */}
        <div className="px-6 pb-2">
          <p style={{ fontSize: 10, color: 'rgba(107,208,231,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
            Como ganhar tokens
          </p>
          <div className="space-y-2">
            {[
              { acao: 'Enviar uma indicação',           tokens: '+100',          cor: '#6bd0e7' },
              { acao: 'Indicado realizar diagnóstico',   tokens: '+200',          cor: '#4ade80' },
              { acao: 'Indicado fechar contrato',        tokens: '+1.000–3.000',  cor: '#f59e0b' },
              { acao: 'Avaliação NPS',                   tokens: '+50–200',       cor: '#a5b4fc' },
            ].map(({ acao, tokens, cor }) => (
              <div key={acao} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(0,137,172,0.06)', border: '1px solid rgba(107,208,231,0.08)' }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{acao}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: cor }}>{tokens}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 py-5">
          <Button
            className="w-full text-white font-semibold"
            style={{ background: 'linear-gradient(135deg, #0089ac, #006d88)', border: 'none', height: 44, fontSize: 14 }}
            onClick={onClose}
          >
            <Zap className="w-4 h-4 mr-2" />
            Começar a indicar
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function PortalWalletPage() {
  const navigate = useNavigate()
  const { data: perfil, isLoading } = usePortalPerfil()
  const { data: transacoes = [] } = useTokenTransacoes()
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    if (!perfil) return
    const key = `portal_welcomed_${perfil.id}`
    if (!localStorage.getItem(key)) {
      setShowWelcome(true)
    }
  }, [perfil?.id])

  function closeWelcome() {
    if (perfil) localStorage.setItem(`portal_welcomed_${perfil.id}`, '1')
    setShowWelcome(false)
    navigate('/portal/indicar')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: 'rgba(107,208,231,0.2)', borderTopColor: '#6bd0e7' }} />
      </div>
    )
  }

  const saldo = perfil?.tokens_saldo ?? 0
  const historico = perfil?.tokens_historico_total ?? 0
  const nivel = calcularNivel(historico)
  const nivelCfg = NIVEL_CONFIG[nivel]
  const proximoNivel = nivel === 'diamante' ? null : Object.values(NIVEL_CONFIG).find(n => n.min > nivelCfg.min) ?? null
  const progresso = proximoNivel
    ? Math.min(100, Math.round(((historico - nivelCfg.min) / (proximoNivel.min - nivelCfg.min)) * 100))
    : 100

  const ultimas = transacoes.slice(0, 6)

  return (
    <div className="space-y-6">
      {/* Modal boas-vindas */}
      {showWelcome && perfil && (
        <WelcomeModal nome={perfil.nome} onClose={closeWelcome} />
      )}

      {/* Saldo + nível */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card saldo */}
        <div className="rounded-2xl p-6" style={{
          background: 'linear-gradient(135deg, rgba(0,137,172,0.18) 0%, rgba(0,8,29,0.6) 100%)',
          border: '1px solid rgba(0,137,172,0.3)',
        }}>
          <div className="flex items-center gap-2 mb-1">
            <Coins className="w-4 h-4" style={{ color: nivelCfg.cor }} />
            <span style={{ fontSize: 11, color: 'rgba(107,208,231,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Saldo disponível
            </span>
          </div>
          <p style={{ fontSize: 40, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>
            {saldo.toLocaleString('pt-BR')}
          </p>
          <p style={{ fontSize: 12, color: 'rgba(107,208,231,0.5)', marginTop: 4 }}>tokens CONSEJ</p>
          <Button
            className="mt-4 w-full text-white text-sm font-medium"
            style={{ background: 'linear-gradient(135deg, #0089ac, #006d88)', border: 'none', height: 38 }}
            onClick={() => navigate('/portal/catalogo')}
          >
            Ver recompensas
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Card nível */}
        <div className="rounded-2xl p-6" style={{
          background: 'rgba(0,8,29,0.5)',
          border: '1px solid rgba(107,208,231,0.1)',
        }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p style={{ fontSize: 11, color: 'rgba(107,208,231,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Nível atual
              </p>
              <p style={{ fontSize: 22, fontWeight: 700, color: nivelCfg.cor, marginTop: 2 }}>
                {nivelCfg.label}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: `${nivelCfg.cor}22`, border: `2px solid ${nivelCfg.cor}44` }}>
              <Target className="w-6 h-6" style={{ color: nivelCfg.cor }} />
            </div>
          </div>

          {/* Barra de progresso */}
          {proximoNivel && (
            <>
              <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(107,208,231,0.1)' }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${progresso}%`, background: `linear-gradient(90deg, ${nivelCfg.cor}, ${proximoNivel.cor})` }} />
              </div>
              <p style={{ fontSize: 11, color: 'rgba(107,208,231,0.45)' }}>
                {historico.toLocaleString('pt-BR')} / {proximoNivel.min.toLocaleString('pt-BR')} tokens acumulados
                {' '}→ próximo: <span style={{ color: proximoNivel.cor }}>{proximoNivel.label}</span>
              </p>
            </>
          )}
          {!proximoNivel && (
            <p style={{ fontSize: 12, color: nivelCfg.cor, fontWeight: 500 }}>
              Nível máximo atingido!
            </p>
          )}
        </div>
      </div>

      {/* CTA indicar */}
      <div className="rounded-xl p-5 flex items-center justify-between gap-4"
        style={{ background: 'rgba(0,137,172,0.08)', border: '1px solid rgba(0,137,172,0.2)' }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Indique um amigo ou empresa</p>
          <p style={{ fontSize: 12, color: 'rgba(107,208,231,0.65)', marginTop: 2 }}>
            Ganhe <strong style={{ color: '#6bd0e7' }}>+100 tokens</strong> ao enviar •{' '}
            <strong style={{ color: '#4ade80' }}>+200</strong> no diagnóstico •{' '}
            <strong style={{ color: '#f59e0b' }}>+1.000–3.000</strong> no fechamento
          </p>
        </div>
        <Button
          className="shrink-0 text-white text-sm font-medium"
          style={{ background: 'linear-gradient(135deg, #0089ac, #006d88)', border: 'none', height: 36 }}
          onClick={() => navigate('/portal/indicar')}
        >
          <UserPlus className="w-4 h-4 mr-1.5" />
          Indicar
        </Button>
      </div>

      {/* Últimas transações */}
      {ultimas.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'rgba(107,208,231,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Últimas movimentações
            </h2>
            <button
              style={{ fontSize: 12, color: 'rgba(107,208,231,0.5)', cursor: 'pointer', background: 'none', border: 'none' }}
              onClick={() => navigate('/portal/historico')}
              onMouseEnter={e => (e.currentTarget.style.color = '#6bd0e7')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(107,208,231,0.5)')}
            >
              Ver tudo →
            </button>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(107,208,231,0.1)' }}>
            {ultimas.map((tx, i) => (
              <div key={tx.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  borderBottom: i < ultimas.length - 1 ? '1px solid rgba(107,208,231,0.07)' : 'none',
                  background: i % 2 === 0 ? 'rgba(0,8,29,0.5)' : 'rgba(0,8,29,0.3)',
                }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: tx.tipo === 'credito' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)' }}>
                  {tx.tipo === 'credito'
                    ? <TrendingUp aria-label="Crédito" className="w-3.5 h-3.5 text-green-400" />
                    : <TrendingDown aria-label="Débito" className="w-3.5 h-3.5 text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 13, color: '#fff' }} className="truncate">
                    {tx.descricao || MOTIVO_LABEL[tx.motivo] || tx.motivo}
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(107,208,231,0.4)' }}>
                    {format(new Date(tx.created_at), "d 'de' MMM, HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <span style={{
                  fontSize: 14, fontWeight: 700,
                  color: tx.tipo === 'credito' ? '#4ade80' : '#f87171',
                }}>
                  {tx.tipo === 'credito' ? '+' : '-'}{tx.valor.toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {ultimas.length === 0 && (
        <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(0,8,29,0.4)', border: '1px solid rgba(107,208,231,0.08)' }}>
          <Gift className="w-10 h-10 mx-auto mb-4" style={{ color: 'rgba(107,208,231,0.25)' }} />
          <p style={{ color: '#fff', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Comece a ganhar tokens agora</p>
          <p style={{ color: 'rgba(107,208,231,0.5)', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
            Sua primeira indicação vale <strong style={{ color: '#6bd0e7' }}>+100 tokens</strong>.<br />
            Se ela fechar contrato, você ganha até <strong style={{ color: '#f59e0b' }}>+3.000 tokens</strong>.
          </p>
          <Button
            className="text-white"
            style={{ background: 'linear-gradient(135deg, #0089ac, #006d88)', border: 'none' }}
            onClick={() => navigate('/portal/indicar')}
          >
            <UserPlus className="w-4 h-4 mr-1.5" />
            Fazer minha primeira indicação
          </Button>
        </div>
      )}
    </div>
  )
}
