import { useState } from 'react'
import { Plus, Pencil, Trash2, X, Save, Megaphone, Sparkles, Gift, Zap, Trophy, Star } from 'lucide-react'
import { useCampanhasTodas, useSalvarCampanha, useExcluirCampanha } from '@/hooks/usePortalAdmin'
import type { Campanha } from '@/types'
import { format, isAfter, isBefore } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const ICONES = [
  { id: 'sparkles', label: 'Estrela', Icon: Sparkles },
  { id: 'gift',     label: 'Presente', Icon: Gift },
  { id: 'zap',      label: 'Raio', Icon: Zap },
  { id: 'trophy',   label: 'Troféu', Icon: Trophy },
  { id: 'star',     label: 'Estrela', Icon: Star },
  { id: 'megaphone',label: 'Megafone', Icon: Megaphone },
]

const CORES = ['#f59e0b', '#6bd0e7', '#4ade80', '#a5b4fc', '#f87171', '#22c55e']

export function getIconForCampanha(id: string) {
  return ICONES.find(i => i.id === id)?.Icon ?? Sparkles
}

function ModalCampanha({ campanha, onClose }: { campanha: Partial<Campanha> | null; onClose: () => void }) {
  const salvar = useSalvarCampanha()
  const editing = !!campanha?.id

  const isoDate = (d?: string) => d ? d.slice(0, 16) : ''

  const [form, setForm] = useState({
    titulo: campanha?.titulo ?? '',
    descricao: campanha?.descricao ?? '',
    cor: campanha?.cor ?? CORES[0],
    icone: campanha?.icone ?? 'sparkles',
    data_inicio: isoDate(campanha?.data_inicio) || isoDate(new Date().toISOString()),
    data_fim: isoDate(campanha?.data_fim),
    ativa: campanha?.ativa ?? true,
    destaque: campanha?.destaque ?? true,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo || !form.descricao || !form.data_fim) return
    await salvar.mutateAsync({
      id: campanha?.id,
      ...form,
      data_inicio: new Date(form.data_inicio).toISOString(),
      data_fim:    new Date(form.data_fim).toISOString(),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,8,29,0.85)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ background: '#000d28', border: '1px solid rgba(107,208,231,0.2)' }}>
        <div className="flex items-center justify-between mb-5">
          <p style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
            {editing ? 'Editar campanha' : 'Nova campanha promocional'}
          </p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(107,208,231,0.4)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label style={{ fontSize: 11, color: 'rgba(107,208,231,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Título *
            </label>
            <input type="text" value={form.titulo} required
              onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              placeholder="Ex: Black Friday CONSEJ"
              maxLength={50}
              className="w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm"
              style={{ background: 'rgba(0,137,172,0.08)', border: '1px solid rgba(107,208,231,0.15)', color: '#fff', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'rgba(107,208,231,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Descrição *
            </label>
            <textarea value={form.descricao} required rows={3}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              placeholder="Indique 3 amigos esta semana e ganhe +500 tokens bônus"
              maxLength={180}
              className="w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm resize-none"
              style={{ background: 'rgba(0,137,172,0.08)', border: '1px solid rgba(107,208,231,0.15)', color: '#fff', outline: 'none' }} />
            <p style={{ fontSize: 10, color: 'rgba(107,208,231,0.3)', marginTop: 2, textAlign: 'right' }}>{form.descricao.length}/180</p>
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'rgba(107,208,231,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Ícone
            </label>
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {ICONES.map(({ id, Icon }) => (
                <button type="button" key={id}
                  onClick={() => setForm(f => ({ ...f, icone: id }))}
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{
                    background: form.icone === id ? `${form.cor}22` : 'rgba(0,137,172,0.06)',
                    border: form.icone === id ? `1px solid ${form.cor}66` : '1px solid rgba(107,208,231,0.1)',
                    cursor: 'pointer',
                  }}>
                  <Icon className="w-4 h-4" style={{ color: form.icone === id ? form.cor : 'rgba(107,208,231,0.5)' }} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'rgba(107,208,231,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Cor de destaque
            </label>
            <div className="flex gap-1.5 mt-1.5">
              {CORES.map(c => (
                <button type="button" key={c}
                  onClick={() => setForm(f => ({ ...f, cor: c }))}
                  className="w-9 h-9 rounded-lg"
                  style={{
                    background: c,
                    border: form.cor === c ? '2px solid #fff' : '1px solid rgba(107,208,231,0.1)',
                    cursor: 'pointer',
                  }} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ fontSize: 11, color: 'rgba(107,208,231,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Início *
              </label>
              <input type="datetime-local" value={form.data_inicio} required
                onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))}
                className="w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm"
                style={{ background: 'rgba(0,137,172,0.08)', border: '1px solid rgba(107,208,231,0.15)', color: '#fff', outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(107,208,231,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Fim *
              </label>
              <input type="datetime-local" value={form.data_fim} required
                onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))}
                className="w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm"
                style={{ background: 'rgba(0,137,172,0.08)', border: '1px solid rgba(107,208,231,0.15)', color: '#fff', outline: 'none' }} />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.ativa}
              onChange={e => setForm(f => ({ ...f, ativa: e.target.checked }))} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Campanha ativa</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.destaque}
              onChange={e => setForm(f => ({ ...f, destaque: e.target.checked }))} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Destacar na carteira do cliente</span>
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

export function CampanhasTab() {
  const { data: campanhas = [], isLoading } = useCampanhasTodas()
  const excluir = useExcluirCampanha()
  const [editando, setEditando] = useState<Partial<Campanha> | null>(null)

  const now = new Date()

  function getStatus(c: Campanha) {
    if (!c.ativa) return { label: 'Inativa',     cor: 'rgba(107,208,231,0.4)' }
    if (isBefore(now, new Date(c.data_inicio))) return { label: 'Agendada',  cor: '#a5b4fc' }
    if (isAfter(now, new Date(c.data_fim)))     return { label: 'Encerrada', cor: 'rgba(107,208,231,0.4)' }
    return { label: 'Ao vivo', cor: '#4ade80' }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p style={{ fontSize: 13, color: 'rgba(107,208,231,0.6)' }}>
          Campanhas com <strong style={{ color: '#fff' }}>destaque</strong> ativas no período aparecem na carteira de todos os clientes.
        </p>
        <button onClick={() => setEditando({})}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold shrink-0 ml-3"
          style={{ background: 'rgba(0,137,172,0.2)', color: '#6bd0e7', border: '1px solid rgba(0,137,172,0.3)', cursor: 'pointer' }}>
          <Plus className="w-4 h-4" /> Nova campanha
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center" style={{ color: 'rgba(107,208,231,0.3)', fontSize: 13 }}>Carregando…</div>
      ) : campanhas.length === 0 ? (
        <div className="py-12 text-center rounded-xl" style={{ border: '1px solid rgba(107,208,231,0.08)', background: 'rgba(0,8,29,0.3)' }}>
          <Megaphone className="w-8 h-8 mx-auto mb-3" style={{ color: 'rgba(107,208,231,0.2)' }} />
          <p style={{ color: 'rgba(107,208,231,0.4)', fontSize: 13 }}>Nenhuma campanha cadastrada.</p>
          <p style={{ color: 'rgba(107,208,231,0.25)', fontSize: 11, marginTop: 4 }}>Crie sua primeira campanha para destacar promoções aos clientes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campanhas.map(c => {
            const status = getStatus(c)
            const Icon = getIconForCampanha(c.icone)
            return (
              <div key={c.id} className="rounded-xl p-4 flex gap-3"
                style={{ background: `${c.cor}0c`, border: `1px solid ${c.cor}33` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${c.cor}22`, border: `1px solid ${c.cor}44` }}>
                  <Icon className="w-5 h-5" style={{ color: c.cor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{c.titulo}</p>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                      style={{ background: `${status.cor}22`, color: status.cor }}>
                      {status.label}
                    </span>
                    {c.destaque && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                        style={{ background: 'rgba(245,158,11,0.18)', color: '#f59e0b' }}>
                        Em destaque
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2, lineHeight: 1.5 }}>{c.descricao}</p>
                  <p style={{ fontSize: 11, color: 'rgba(107,208,231,0.4)', marginTop: 4 }}>
                    {format(new Date(c.data_inicio), "d 'de' MMM, HH:mm", { locale: ptBR })}
                    {' → '}
                    {format(new Date(c.data_fim), "d 'de' MMM 'de' yyyy, HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button onClick={() => setEditando(c)} title="Editar"
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(0,137,172,0.1)', border: '1px solid rgba(0,137,172,0.2)', cursor: 'pointer' }}>
                    <Pencil className="w-3 h-3" style={{ color: '#6bd0e7' }} />
                  </button>
                  <button onClick={() => { if (confirm('Excluir esta campanha?')) excluir.mutate(c.id) }} title="Excluir"
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer' }}>
                    <Trash2 className="w-3 h-3" style={{ color: '#f87171' }} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editando !== null && <ModalCampanha campanha={editando} onClose={() => setEditando(null)} />}
    </div>
  )
}
