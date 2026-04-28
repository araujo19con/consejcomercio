import { useState } from 'react'
import { Plus, Pencil, Trash2, X, Save, Coins } from 'lucide-react'
import { useRegrasTokens, useSalvarRegra, useExcluirRegra } from '@/hooks/usePortalAdmin'
import type { RegraToken } from '@/types'

function ModalRegra({ regra, onClose }: { regra: Partial<RegraToken> | null; onClose: () => void }) {
  const salvar = useSalvarRegra()
  const editing = !!regra?.id
  const [form, setForm] = useState({
    motivo: regra?.motivo ?? '',
    label: regra?.label ?? '',
    descricao: regra?.descricao ?? '',
    valor_tokens: regra?.valor_tokens ?? 100,
    ativo: regra?.ativo ?? true,
    ordem: regra?.ordem ?? 99,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.motivo || !form.label || !form.valor_tokens) return
    await salvar.mutateAsync({ id: regra?.id, ...form })
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
            {editing ? 'Editar regra' : 'Nova regra de tokens'}
          </p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(107,208,231,0.4)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label style={{ fontSize: 11, color: 'rgba(107,208,231,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Motivo (id técnico — sem espaços) *
            </label>
            <input type="text" value={form.motivo} required disabled={editing}
              onChange={e => setForm(f => ({ ...f, motivo: e.target.value.replace(/\s/g, '_').toLowerCase() }))}
              placeholder="ex: post_linkedin"
              className="w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm"
              style={{ background: 'rgba(0,137,172,0.08)', border: '1px solid rgba(107,208,231,0.15)', color: '#fff', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'rgba(107,208,231,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Nome amigável *
            </label>
            <input type="text" value={form.label} required
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="Ex: Post no LinkedIn marcando CONSEJ"
              className="w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm"
              style={{ background: 'rgba(0,137,172,0.08)', border: '1px solid rgba(107,208,231,0.15)', color: '#fff', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'rgba(107,208,231,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Descrição
            </label>
            <input type="text" value={form.descricao}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              placeholder="Detalhe opcional"
              className="w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm"
              style={{ background: 'rgba(0,137,172,0.08)', border: '1px solid rgba(107,208,231,0.15)', color: '#fff', outline: 'none' }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ fontSize: 11, color: 'rgba(107,208,231,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Tokens *
              </label>
              <input type="number" min={1} value={form.valor_tokens} required
                onChange={e => setForm(f => ({ ...f, valor_tokens: parseInt(e.target.value, 10) || 0 }))}
                className="w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm"
                style={{ background: 'rgba(0,137,172,0.08)', border: '1px solid rgba(107,208,231,0.15)', color: '#fff', outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(107,208,231,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Ordem
              </label>
              <input type="number" value={form.ordem}
                onChange={e => setForm(f => ({ ...f, ordem: parseInt(e.target.value, 10) || 0 }))}
                className="w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm"
                style={{ background: 'rgba(0,137,172,0.08)', border: '1px solid rgba(107,208,231,0.15)', color: '#fff', outline: 'none' }} />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.ativo}
              onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Ativo</span>
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

export function RegrasTab() {
  const { data: regras = [], isLoading } = useRegrasTokens()
  const excluir = useExcluirRegra()
  const [editando, setEditando] = useState<Partial<RegraToken> | null>(null)

  function handleExcluir(id: string, motivo: string) {
    if (motivo === 'indicacao' || motivo === 'cadastro') {
      alert(`A regra "${motivo}" é usada pelo sistema e não pode ser excluída. Você pode desativá-la se quiser.`)
      return
    }
    if (confirm('Excluir esta regra? As transações já creditadas continuam no histórico.')) {
      excluir.mutate(id)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p style={{ fontSize: 13, color: 'rgba(107,208,231,0.6)' }}>
          Configure quanto cada ação concede em tokens. As regras "indicacao" e "cadastro" são usadas automaticamente pelo sistema.
        </p>
        <button onClick={() => setEditando({})}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold shrink-0 ml-3"
          style={{ background: 'rgba(0,137,172,0.2)', color: '#6bd0e7', border: '1px solid rgba(0,137,172,0.3)', cursor: 'pointer' }}>
          <Plus className="w-4 h-4" /> Nova regra
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center" style={{ color: 'rgba(107,208,231,0.3)', fontSize: 13 }}>Carregando…</div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(107,208,231,0.1)' }}>
          {regras.map((r, i) => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3"
              style={{
                borderBottom: i < regras.length - 1 ? '1px solid rgba(107,208,231,0.07)' : 'none',
                background: i % 2 === 0 ? 'rgba(0,8,29,0.5)' : 'rgba(0,8,29,0.3)',
                opacity: r.ativo ? 1 : 0.5,
              }}>
              <Coins className="w-4 h-4 shrink-0" style={{ color: r.ativo ? '#6bd0e7' : 'rgba(107,208,231,0.3)' }} />
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 13, fontWeight: 600, color: '#fff' }} className="truncate">
                  {r.label}
                  {!r.ativo && <span style={{ fontSize: 10, color: 'rgba(239,68,68,0.7)', marginLeft: 8 }}>INATIVA</span>}
                </p>
                <p style={{ fontSize: 11, color: 'rgba(107,208,231,0.4)' }} className="truncate">
                  <code style={{ color: 'rgba(107,208,231,0.6)' }}>{r.motivo}</code>
                  {r.descricao && ` · ${r.descricao}`}
                </p>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#4ade80', minWidth: 70, textAlign: 'right' }}>
                +{r.valor_tokens.toLocaleString('pt-BR')}
              </span>
              <button onClick={() => setEditando(r)} title="Editar"
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(0,137,172,0.1)', border: '1px solid rgba(0,137,172,0.2)', cursor: 'pointer' }}>
                <Pencil className="w-3 h-3" style={{ color: '#6bd0e7' }} />
              </button>
              <button onClick={() => handleExcluir(r.id, r.motivo)} title="Excluir"
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer' }}>
                <Trash2 className="w-3 h-3" style={{ color: '#f87171' }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {editando !== null && <ModalRegra regra={editando} onClose={() => setEditando(null)} />}
    </div>
  )
}
