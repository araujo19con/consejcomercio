import { useState } from 'react'
import { Plus, Pencil, Trash2, X, Save, Gift, ShieldCheck } from 'lucide-react'
import { useCatalogoTodos, useSalvarRecompensa, useExcluirRecompensa } from '@/hooks/usePortalAdmin'
import type { CatalogoRecompensa } from '@/types'

const TIER_CONFIG: Record<CatalogoRecompensa['tier'], { label: string; cor: string }> = {
  cortesia: { label: 'Cortesia',  cor: '#6bd0e7' },
  desconto: { label: 'Desconto',  cor: '#4ade80' },
  servico:  { label: 'Serviço',   cor: '#f59e0b' },
  premium:  { label: 'Premium',   cor: '#818cf8' },
}

const TIER_ORDER: Array<CatalogoRecompensa['tier']> = ['cortesia', 'desconto', 'servico', 'premium']

function ModalRecompensa({ item, onClose }: { item: Partial<CatalogoRecompensa> | null; onClose: () => void }) {
  const salvar = useSalvarRecompensa()
  const editing = !!item?.id
  const [form, setForm] = useState({
    nome: item?.nome ?? '',
    descricao: item?.descricao ?? '',
    tier: (item?.tier ?? 'cortesia') as CatalogoRecompensa['tier'],
    custo_tokens: item?.custo_tokens ?? 200,
    aprovacao_dupla: item?.aprovacao_dupla ?? false,
    ativo: item?.ativo ?? true,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome || !form.tier || !form.custo_tokens) return
    await salvar.mutateAsync({ id: item?.id, ...form })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,8,29,0.85)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-2xl p-6"
        style={{ background: '#000d28', border: '1px solid rgba(107,208,231,0.2)' }}>
        <div className="flex items-center justify-between mb-5">
          <p style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
            {editing ? 'Editar recompensa' : 'Nova recompensa'}
          </p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(107,208,231,0.4)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label style={{ fontSize: 11, color: 'rgba(107,208,231,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Nome *
            </label>
            <input type="text" value={form.nome} required
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Ex: Camiseta CONSEJ"
              className="w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm"
              style={{ background: 'rgba(0,137,172,0.08)', border: '1px solid rgba(107,208,231,0.15)', color: '#fff', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'rgba(107,208,231,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Descrição
            </label>
            <textarea value={form.descricao}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              rows={2} placeholder="Detalhes da recompensa"
              className="w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm resize-none"
              style={{ background: 'rgba(0,137,172,0.08)', border: '1px solid rgba(107,208,231,0.15)', color: '#fff', outline: 'none' }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ fontSize: 11, color: 'rgba(107,208,231,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Tier *
              </label>
              <select value={form.tier}
                onChange={e => setForm(f => ({ ...f, tier: e.target.value as CatalogoRecompensa['tier'] }))}
                className="w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm"
                style={{ background: 'rgba(0,137,172,0.08)', border: '1px solid rgba(107,208,231,0.15)', color: '#fff', outline: 'none' }}>
                {TIER_ORDER.map(t => (
                  <option key={t} value={t} style={{ background: '#000d28' }}>{TIER_CONFIG[t].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(107,208,231,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Custo (tokens) *
              </label>
              <input type="number" min={1} value={form.custo_tokens} required
                onChange={e => setForm(f => ({ ...f, custo_tokens: parseInt(e.target.value, 10) || 0 }))}
                className="w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm"
                style={{ background: 'rgba(0,137,172,0.08)', border: '1px solid rgba(107,208,231,0.15)', color: '#fff', outline: 'none' }} />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.aprovacao_dupla}
              onChange={e => setForm(f => ({ ...f, aprovacao_dupla: e.target.checked }))} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Requer aprovação dupla</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.ativo}
              onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Visível no catálogo</span>
          </label>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'transparent', border: '1px solid rgba(107,208,231,0.15)', color: 'rgba(107,208,231,0.5)', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={salvar.isPending}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-1.5"
              style={{ background: 'linear-gradient(135deg, #0089ac, #006d88)', cursor: 'pointer', border: 'none' }}>
              <Save className="w-3.5 h-3.5" /> {salvar.isPending ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function CatalogoTab() {
  const { data: items = [], isLoading } = useCatalogoTodos()
  const excluir = useExcluirRecompensa()
  const [editando, setEditando] = useState<Partial<CatalogoRecompensa> | null>(null)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p style={{ fontSize: 13, color: 'rgba(107,208,231,0.6)' }}>
          Recompensas disponíveis no catálogo do portal. Itens inativos não aparecem para o cliente.
        </p>
        <button onClick={() => setEditando({})}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold shrink-0 ml-3"
          style={{ background: 'rgba(0,137,172,0.2)', color: '#6bd0e7', border: '1px solid rgba(0,137,172,0.3)', cursor: 'pointer' }}>
          <Plus className="w-4 h-4" /> Nova recompensa
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center" style={{ color: 'rgba(107,208,231,0.3)', fontSize: 13 }}>Carregando…</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center rounded-xl" style={{ border: '1px solid rgba(107,208,231,0.08)', background: 'rgba(0,8,29,0.3)' }}>
          <Gift className="w-8 h-8 mx-auto mb-3" style={{ color: 'rgba(107,208,231,0.2)' }} />
          <p style={{ color: 'rgba(107,208,231,0.4)', fontSize: 13 }}>Nenhuma recompensa cadastrada.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {TIER_ORDER.map(tier => {
            const cfg   = TIER_CONFIG[tier]
            const lista = items.filter(i => i.tier === tier)
            if (lista.length === 0) return null
            return (
              <div key={tier} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${cfg.cor}22` }}>
                <div className="px-4 py-2" style={{ background: `${cfg.cor}0d` }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: cfg.cor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {cfg.label} ({lista.length})
                  </span>
                </div>
                {lista.map((item, i) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3"
                    style={{
                      borderTop: i > 0 ? '1px solid rgba(107,208,231,0.05)' : 'none',
                      background: i % 2 === 0 ? 'rgba(0,8,29,0.5)' : 'rgba(0,8,29,0.3)',
                      opacity: item.ativo ? 1 : 0.5,
                    }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#fff' }} className="truncate">{item.nome}</p>
                        {item.aprovacao_dupla && <ShieldCheck className="w-3 h-3 shrink-0" style={{ color: '#818cf8' }} />}
                        {!item.ativo && <span style={{ fontSize: 9, color: 'rgba(239,68,68,0.7)', fontWeight: 700 }}>INATIVA</span>}
                      </div>
                      {item.descricao && (
                        <p style={{ fontSize: 11, color: 'rgba(107,208,231,0.4)' }} className="truncate">{item.descricao}</p>
                      )}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: cfg.cor, minWidth: 70, textAlign: 'right' }}>
                      {item.custo_tokens.toLocaleString('pt-BR')}
                    </span>
                    <button onClick={() => setEditando(item)} title="Editar"
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(0,137,172,0.1)', border: '1px solid rgba(0,137,172,0.2)', cursor: 'pointer' }}>
                      <Pencil className="w-3 h-3" style={{ color: '#6bd0e7' }} />
                    </button>
                    <button onClick={() => { if (confirm('Excluir esta recompensa?')) excluir.mutate(item.id) }} title="Excluir"
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer' }}>
                      <Trash2 className="w-3 h-3" style={{ color: '#f87171' }} />
                    </button>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {editando !== null && <ModalRecompensa item={editando} onClose={() => setEditando(null)} />}
    </div>
  )
}
