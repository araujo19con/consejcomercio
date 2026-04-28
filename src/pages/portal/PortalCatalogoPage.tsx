import { useState } from 'react'
import { usePortalPerfil, useCatalogoRecompensas, useSolicitarResgate } from '@/hooks/usePortal'
import { Button } from '@/components/ui/button'
import { type CatalogoRecompensa } from '@/types'
import { Gift, Coins, Lock, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react'

const TIER_CONFIG = {
  cortesia: { label: 'Cortesias',  cor: '#6bd0e7', desc: '100–500 tokens' },
  desconto: { label: 'Descontos',  cor: '#4ade80', desc: '500–2.500 tokens' },
  servico:  { label: 'Serviços',   cor: '#f59e0b', desc: '2.500–5.000 tokens' },
  premium:  { label: 'Premium',    cor: '#818cf8', desc: '5.000+ tokens' },
}

const TIER_ORDER: Array<CatalogoRecompensa['tier']> = ['cortesia', 'desconto', 'servico', 'premium']

function RecompensaCard({
  item,
  saldo,
  onResgatar,
  isPending,
}: {
  item: CatalogoRecompensa
  saldo: number
  onResgatar: (item: CatalogoRecompensa) => void
  isPending: boolean
}) {
  const podeResgatar = saldo >= item.custo_tokens
  const cfg = TIER_CONFIG[item.tier]

  return (
    <div className="rounded-xl p-4 flex flex-col gap-3"
      style={{
        background: 'rgba(0,8,29,0.5)',
        border: `1px solid ${podeResgatar ? `${cfg.cor}33` : 'rgba(107,208,231,0.08)'}`,
        opacity: podeResgatar ? 1 : 0.65,
      }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>{item.nome}</p>
          {item.descricao && (
            <p style={{ fontSize: 12, color: 'rgba(107,208,231,0.5)', marginTop: 3, lineHeight: 1.5 }}>{item.descricao}</p>
          )}
        </div>
        {item.aprovacao_dupla && (
          <div title="Sujeito a aprovação dupla">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#818cf8' }} />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-1.5">
          <Coins className="w-3.5 h-3.5" style={{ color: cfg.cor }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: cfg.cor }}>
            {item.custo_tokens.toLocaleString('pt-BR')}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(107,208,231,0.4)' }}>tokens</span>
        </div>
        <Button
          size="sm"
          disabled={!podeResgatar || isPending}
          onClick={() => onResgatar(item)}
          style={{
            background: podeResgatar ? `linear-gradient(135deg, ${cfg.cor}cc, ${cfg.cor}88)` : 'rgba(107,208,231,0.08)',
            border: 'none', color: podeResgatar ? '#00081d' : 'rgba(107,208,231,0.3)',
            fontWeight: 600, fontSize: 12,
          }}
        >
          {!podeResgatar && <Lock className="w-3 h-3 mr-1" />}
          {podeResgatar ? 'Resgatar' : `Faltam ${(item.custo_tokens - saldo).toLocaleString('pt-BR')}`}
        </Button>
      </div>
    </div>
  )
}

export function PortalCatalogoPage() {
  const { data: perfil } = usePortalPerfil()
  const { data: catalogo = [], isLoading } = useCatalogoRecompensas()
  const { mutate: solicitarResgate, isPending } = useSolicitarResgate()

  const [confirmando, setConfirmando] = useState<CatalogoRecompensa | null>(null)
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set(['cortesia', 'desconto']))

  const saldo = perfil?.tokens_saldo ?? 0

  function toggleTier(tier: string) {
    setExpandidos(prev => {
      const next = new Set(prev)
      next.has(tier) ? next.delete(tier) : next.add(tier)
      return next
    })
  }

  function handleResgatar(item: CatalogoRecompensa) {
    setConfirmando(item)
  }

  function confirmarResgate() {
    if (!confirmando || !perfil) return
    solicitarResgate(
      { catalogo: confirmando, perfilId: perfil.id, saldoAtual: saldo },
      { onSettled: () => setConfirmando(null) }
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: 'rgba(107,208,231,0.2)', borderTopColor: '#6bd0e7' }} />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(0,137,172,0.15)', border: '1px solid rgba(0,137,172,0.3)' }}>
          <Gift className="w-5 h-5" style={{ color: '#6bd0e7' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>Catálogo de Recompensas</h1>
          <p style={{ fontSize: 13, color: 'rgba(107,208,231,0.5)' }}>
            Seu saldo:{' '}
            <strong style={{ color: '#6bd0e7' }}>{saldo.toLocaleString('pt-BR')} tokens</strong>
          </p>
        </div>
      </div>

      <p style={{ fontSize: 13, color: 'rgba(107,208,231,0.5)', marginBottom: 24, lineHeight: 1.6 }}>
        Resgate recompensas com seus tokens acumulados. Itens marcados com{' '}
        <ShieldCheck className="w-3.5 h-3.5 inline mb-0.5" style={{ color: '#818cf8' }} />{' '}
        exigem aprovação dupla da CONSEJ.
      </p>

      {/* Tiers */}
      <div className="space-y-4">
        {TIER_ORDER.map(tier => {
          const items = catalogo.filter(i => i.tier === tier)
          if (items.length === 0) return null
          const cfg = TIER_CONFIG[tier]
          const expanded = expandidos.has(tier)
          const temAcessivel = items.some(i => saldo >= i.custo_tokens)

          return (
            <div key={tier} className="rounded-2xl overflow-hidden"
              style={{ border: `1px solid ${cfg.cor}22` }}>
              <button
                className="w-full flex items-center justify-between px-4 py-3 transition-colors"
                style={{ background: `${cfg.cor}0d` }}
                onClick={() => toggleTier(tier)}
              >
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 13, fontWeight: 700, color: cfg.cor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {cfg.label}
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(107,208,231,0.4)' }}>{cfg.desc}</span>
                  {temAcessivel && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                      style={{ background: `${cfg.cor}22`, color: cfg.cor }}>
                      disponível
                    </span>
                  )}
                </div>
                {expanded
                  ? <ChevronUp className="w-4 h-4" style={{ color: 'rgba(107,208,231,0.4)' }} />
                  : <ChevronDown className="w-4 h-4" style={{ color: 'rgba(107,208,231,0.4)' }} />}
              </button>

              {expanded && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4"
                  style={{ background: 'rgba(0,8,29,0.3)' }}>
                  {items.map(item => (
                    <RecompensaCard
                      key={item.id}
                      item={item}
                      saldo={saldo}
                      onResgatar={handleResgatar}
                      isPending={isPending}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal de confirmação */}
      {confirmando && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setConfirmando(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{
              background: '#00081d',
              border: '1px solid rgba(107,208,231,0.2)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
              Confirmar resgate
            </h3>
            <p style={{ fontSize: 14, color: 'rgba(107,208,231,0.7)', marginBottom: 4 }}>
              {confirmando.nome}
            </p>
            <div className="flex items-center gap-2 mb-5">
              <Coins className="w-4 h-4" style={{ color: TIER_CONFIG[confirmando.tier].cor }} />
              <span style={{ fontSize: 16, fontWeight: 700, color: TIER_CONFIG[confirmando.tier].cor }}>
                {confirmando.custo_tokens.toLocaleString('pt-BR')} tokens
              </span>
              <span style={{ fontSize: 12, color: 'rgba(107,208,231,0.4)' }}>
                → saldo restante: {(saldo - confirmando.custo_tokens).toLocaleString('pt-BR')}
              </span>
            </div>
            {confirmando.aprovacao_dupla && (
              <div className="rounded-lg p-3 mb-5 flex items-start gap-2"
                style={{ background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.2)' }}>
                <ShieldCheck className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <p style={{ fontSize: 12, color: 'rgba(129,140,248,0.9)', lineHeight: 1.5 }}>
                  Este item requer aprovação dupla pela equipe CONSEJ. Você receberá uma confirmação por e-mail.
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1"
                style={{ color: 'rgba(107,208,231,0.6)', border: '1px solid rgba(107,208,231,0.15)' }}
                onClick={() => setConfirmando(null)}>
                Cancelar
              </Button>
              <Button className="flex-1 text-white font-semibold"
                style={{ background: 'linear-gradient(135deg, #0089ac, #006d88)', border: 'none' }}
                onClick={confirmarResgate}
                disabled={isPending}>
                {isPending ? 'Processando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
