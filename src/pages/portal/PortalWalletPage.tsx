import { useNavigate } from 'react-router-dom'
import { usePortalPerfil, useTokenTransacoes } from '@/hooks/usePortal'
import { calcularNivel, NIVEL_CONFIG } from '@/types'
import { Coins, UserPlus, TrendingUp, TrendingDown, Target, ChevronRight } from 'lucide-react'
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

export function PortalWalletPage() {
  const navigate = useNavigate()
  const { data: perfil, isLoading } = usePortalPerfil()
  const { data: transacoes = [] } = useTokenTransacoes()

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
                {' '}→ próximo: <span style={{ color: proximoNivel.cor }}>{Object.entries(NIVEL_CONFIG).find(([,v]) => v.min === proximoNivel.min)?.[0] ? Object.entries(NIVEL_CONFIG).find(([,v]) => v.min === proximoNivel.min)![1].label : ''}</span>
              </p>
            </>
          )}
          {!proximoNivel && (
            <p style={{ fontSize: 12, color: nivelCfg.cor, fontWeight: 500 }}>
              Nível máximo atingido! +{nivelCfg.bonus}% bônus em todas as indicações.
            </p>
          )}
          {nivelCfg.bonus > 0 && (
            <div className="mt-3 px-3 py-1.5 rounded-lg inline-block"
              style={{ background: `${nivelCfg.cor}18`, border: `1px solid ${nivelCfg.cor}33` }}>
              <p style={{ fontSize: 11, color: nivelCfg.cor, fontWeight: 600 }}>
                +{nivelCfg.bonus}% bônus em indicações
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Missão ativa */}
      <div className="rounded-xl p-4 flex items-center gap-4"
        style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'rgba(245,158,11,0.15)' }}>
          <Target className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Missão de Lançamento</p>
          <p style={{ fontSize: 12, color: 'rgba(245,158,11,0.8)' }}>
            Indique 3 amigos em 30 dias e ganhe <strong>+500 tokens bônus</strong>
          </p>
        </div>
        <Button size="sm" variant="ghost"
          style={{ color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', fontSize: 12 }}
          onClick={() => navigate('/portal/indicar')}>
          Indicar agora
        </Button>
      </div>

      {/* CTA indicar */}
      <div className="rounded-xl p-5 flex items-center justify-between gap-4"
        style={{ background: 'rgba(0,137,172,0.08)', border: '1px solid rgba(0,137,172,0.2)' }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Indique um amigo ou empresa</p>
          <p style={{ fontSize: 12, color: 'rgba(107,208,231,0.65)', marginTop: 2 }}>
            Ganhe <strong style={{ color: '#6bd0e7' }}>+100 tokens</strong> ao enviar uma indicação
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
                    ? <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                    : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
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
        <div className="text-center py-12">
          <Coins className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(107,208,231,0.2)' }} />
          <p style={{ color: 'rgba(107,208,231,0.5)', fontSize: 14 }}>Nenhuma movimentação ainda.</p>
          <p style={{ color: 'rgba(107,208,231,0.35)', fontSize: 12, marginTop: 4 }}>
            Comece indicando um amigo para ganhar seus primeiros tokens!
          </p>
        </div>
      )}
    </div>
  )
}
