import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Briefcase, FileText, Inbox, ArrowRight, KanbanSquare, Calendar, Share2, Handshake, TrendingUp } from 'lucide-react'
import { useLeads } from '@/hooks/useLeads'
import { useClientes } from '@/hooks/useClientes'
import { useContratos } from '@/hooks/useContratos'
import { useDemandas } from '@/hooks/useDemandas'
import { useReunioes } from '@/hooks/useReunioes'
import { useIndicacoes } from '@/hooks/useIndicacoes'
import { useOportunidades } from '@/hooks/useOportunidades'
import { useParceiros } from '@/hooks/useParceiros'
import { cn } from '@/lib/utils'

interface ResultItem {
  id: string
  label: string
  sublabel?: string
  path: string
  category: string
}

const CATEGORY_META: Record<string, { icon: React.FC<{ className?: string }>; color: string; bg: string }> = {
  Leads:       { icon: KanbanSquare, color: 'text-indigo-600',  bg: 'bg-indigo-50'   },
  Clientes:    { icon: Briefcase,    color: 'text-emerald-600', bg: 'bg-emerald-50'  },
  Contratos:   { icon: FileText,     color: 'text-amber-600',   bg: 'bg-amber-50'    },
  Demandas:    { icon: Inbox,        color: 'text-violet-600',  bg: 'bg-violet-50'   },
  Reuniões:    { icon: Calendar,     color: 'text-blue-600',    bg: 'bg-blue-50'     },
  Indicações:  { icon: Share2,       color: 'text-rose-600',    bg: 'bg-rose-50'     },
  Oportunidades: { icon: TrendingUp, color: 'text-orange-600',  bg: 'bg-orange-50'   },
  Parceiros:   { icon: Handshake,    color: 'text-cyan-600',    bg: 'bg-cyan-50'     },
}

function highlight(text: string, query: string) {
  if (!query.trim()) return <span>{text}</span>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <span>{text}</span>
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="bg-yellow-100 text-yellow-900 rounded px-0.5 font-semibold not-italic">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  )
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const { data: leads = [] }        = useLeads()
  const { data: clientes = [] }     = useClientes()
  const { data: contratos = [] }    = useContratos()
  const { data: demandas = [] }     = useDemandas()
  const { data: reunioes = [] }     = useReunioes()
  const { data: indicacoes = [] }   = useIndicacoes()
  const { data: oportunidades = [] } = useOportunidades()
  const { data: parceiros = [] }    = useParceiros()

  /* ── Keyboard shortcut ── */
  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    else setQuery('')
  }, [open])

  /* ── Filter results ── */
  const q = query.toLowerCase().trim()

  const results: ResultItem[] = q
    ? [
        ...leads
          .filter(l => l.nome.toLowerCase().includes(q) || l.empresa?.toLowerCase().includes(q))
          .slice(0, 4)
          .map(l => ({ id: l.id, label: l.nome, sublabel: l.empresa, path: `/leads/${l.id}`, category: 'Leads' })),
        ...clientes
          .filter(c => c.nome.toLowerCase().includes(q) || c.empresa?.toLowerCase().includes(q))
          .slice(0, 4)
          .map(c => ({ id: c.id, label: c.nome, sublabel: c.empresa, path: `/clientes/${c.id}`, category: 'Clientes' })),
        ...contratos
          .filter(c => c.cliente?.nome.toLowerCase().includes(q) || c.cliente?.empresa?.toLowerCase().includes(q) || c.tipo?.toLowerCase().includes(q))
          .slice(0, 3)
          .map(c => ({ id: c.id, label: c.cliente?.nome ?? '—', sublabel: `Contrato · ${c.tipo}`, path: `/contratos`, category: 'Contratos' })),
        ...demandas
          .filter(d => d.titulo.toLowerCase().includes(q) || d.cliente?.nome.toLowerCase().includes(q))
          .slice(0, 3)
          .map(d => ({ id: d.id, label: d.titulo, sublabel: d.cliente?.nome, path: `/demandas`, category: 'Demandas' })),
        ...reunioes
          .filter(r => r.titulo.toLowerCase().includes(q))
          .slice(0, 3)
          .map(r => ({ id: r.id, label: r.titulo, sublabel: new Date(r.data_hora).toLocaleDateString('pt-BR'), path: `/reunioes`, category: 'Reuniões' })),
        ...indicacoes
          .filter(i => i.indicado_nome.toLowerCase().includes(q) || i.indicado_empresa?.toLowerCase().includes(q))
          .slice(0, 3)
          .map(i => ({ id: i.id, label: i.indicado_nome, sublabel: i.indicado_empresa ?? undefined, path: `/indicacoes`, category: 'Indicações' })),
        ...oportunidades
          .filter(o => o.titulo.toLowerCase().includes(q) || o.cliente?.nome.toLowerCase().includes(q))
          .slice(0, 3)
          .map(o => ({ id: o.id, label: o.titulo, sublabel: o.cliente?.nome, path: `/oportunidades`, category: 'Oportunidades' })),
        ...parceiros
          .filter(p => p.nome.toLowerCase().includes(q))
          .slice(0, 3)
          .map(p => ({ id: p.id, label: p.nome, sublabel: p.tipo, path: `/parceiros`, category: 'Parceiros' })),
      ]
    : []

  /* ── Group by category ── */
  const grouped = results.reduce<Record<string, ResultItem[]>>((acc, r) => {
    if (!acc[r.category]) acc[r.category] = []
    acc[r.category].push(r)
    return acc
  }, {})

  const flat = Object.values(grouped).flat()

  useEffect(() => { setActiveIdx(0) }, [query])

  function go(path: string) {
    navigate(path)
    setOpen(false)
    setQuery('')
  }

  function onResultKeydown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, flat.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && flat[activeIdx]) go(flat[activeIdx].path)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        onKeyDown={onResultKeydown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar leads, clientes, contratos, demandas…"
            className="flex-1 text-sm text-slate-800 placeholder-slate-400 outline-none bg-transparent"
          />
          <kbd className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {!q && (
            <div className="py-10 text-center">
              <Search className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Digite para buscar em todo o CRM</p>
            </div>
          )}

          {q && results.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-400">Nenhum resultado para <strong>"{query}"</strong></p>
            </div>
          )}

          {Object.entries(grouped).map(([category, items]) => {
            const meta = CATEGORY_META[category]
            const Icon = meta.icon
            return (
              <div key={category}>
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100">
                  <div className={cn('w-5 h-5 rounded flex items-center justify-center', meta.bg)}>
                    <Icon className={cn('w-3 h-3', meta.color)} />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{category}</span>
                </div>
                {items.map(item => {
                  const globalIdx = flat.indexOf(item)
                  const isActive = globalIdx === activeIdx
                  return (
                    <button
                      key={item.id}
                      onClick={() => go(item.path)}
                      onMouseEnter={() => setActiveIdx(globalIdx)}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-3 text-left transition-colors border-b border-slate-50 last:border-0',
                        isActive ? 'bg-slate-50' : 'hover:bg-slate-50'
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {highlight(item.label, query)}
                        </p>
                        {item.sublabel && (
                          <p className="text-xs text-slate-400 truncate">
                            {highlight(item.sublabel, query)}
                          </p>
                        )}
                      </div>
                      {isActive && <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Footer hints */}
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center gap-4">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <kbd className="bg-white border border-slate-200 rounded px-1 py-0.5 font-mono text-[10px]">↑↓</kbd> navegar
          </span>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <kbd className="bg-white border border-slate-200 rounded px-1 py-0.5 font-mono text-[10px]">Enter</kbd> abrir
          </span>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <kbd className="bg-white border border-slate-200 rounded px-1 py-0.5 font-mono text-[10px]">Esc</kbd> fechar
          </span>
        </div>
      </div>
    </div>
  )
}
