import { useState } from 'react'
import { useDemandas, useCreateDemanda, useUpdateDemanda, useDeleteDemanda } from '@/hooks/useDemandas'
import { useContratos } from '@/hooks/useContratos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DEMANDA_TIPOS, SERVICE_AREAS } from '@/lib/constants'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Plus, Trash2 } from 'lucide-react'
import { SearchInput } from '@/components/ui/search-input'
import { cn } from '@/lib/utils'

const DEMANDA_STATUS = [
  { value: 'aberta', label: 'Aberta', color: 'bg-[rgba(59,130,246,0.15)] text-[#93c5fd]' },
  { value: 'em_andamento', label: 'Em Andamento', color: 'bg-[rgba(245,158,11,0.15)] text-[#fbbf24]' },
  { value: 'concluida', label: 'Concluída', color: 'bg-[rgba(16,185,129,0.15)] text-[#34d399]' },
  { value: 'cancelada', label: 'Cancelada', color: 'bg-[rgba(239,68,68,0.15)] text-[#f87171]' },
]

export function DemandasPage() {
  const { data: demandas, isLoading } = useDemandas()
  const { data: contratos } = useContratos()
  const createDemanda = useCreateDemanda()
  const updateDemanda = useUpdateDemanda()
  const deleteDemanda = useDeleteDemanda()
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('todos')
  const [showNew, setShowNew] = useState(false)

  // New demanda form state
  const [contratoId, setContratoId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState('simples')
  const [area, setArea] = useState('')
  const [descricao, setDescricao] = useState('')
  const [responsavel, setResponsavel] = useState('')

  const filtered = demandas?.filter(d => {
    const q = search.toLowerCase()
    const matchSearch = !search || d.titulo.toLowerCase().includes(q) || d.cliente?.nome?.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'todos' || d.status === statusFilter
    return matchSearch && matchStatus
  }) || []

  function handleCreate() {
    const contrato = contratos?.find(c => c.id === contratoId)
    if (!contrato || !titulo || !tipo) return
    createDemanda.mutate({
      contrato_id: contratoId,
      cliente_id: contrato.cliente_id,
      titulo,
      tipo,
      area_direito: area || null,
      descricao: descricao || null,
      responsavel: responsavel || null,
      status: 'aberta',
      data_abertura: new Date().toISOString(),
      data_conclusao: null,
    }, {
      onSuccess: () => {
        setShowNew(false)
        setContratoId(''); setTitulo(''); setTipo('simples'); setArea(''); setDescricao(''); setResponsavel('')
      }
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">Demandas</h1>
        <Button size="sm" onClick={() => setShowNew(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1" /> Nova Demanda
        </Button>
      </div>

      <div className="flex gap-3 mb-5">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar demanda…" className="max-w-xs flex-1" />
        <div className="flex gap-1.5">
          {['todos', ...DEMANDA_STATUS.map(s => s.value)].map(s => (
            <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'outline'}
              onClick={() => setStatusFilter(s)}
              className={statusFilter === s ? 'bg-primary hover:bg-primary/90' : ''}>
              {s === 'todos' ? 'Todos' : DEMANDA_STATUS.find(d => d.value === s)?.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? <div className="text-center text-muted-foreground py-8">Carregando...</div> : (
        <div className="space-y-2">
          {filtered.map(demanda => {
            const statusInfo = DEMANDA_STATUS.find(s => s.value === demanda.status)
            const tipoInfo = DEMANDA_TIPOS.find(t => t.value === demanda.tipo)
            return (
              <Card key={demanda.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{demanda.titulo}</p>
                      <p className="text-sm text-muted-foreground">{demanda.cliente?.nome} · {demanda.cliente?.empresa}</p>
                      {demanda.area_direito && <p className="text-xs text-fg4 mt-0.5">{demanda.area_direito.replace(/_/g, ' ')}</p>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', tipoInfo?.valor === 500 ? 'bg-[rgba(139,92,246,0.15)] text-[#a78bfa]' : 'bg-[rgba(59,130,246,0.15)] text-[#93c5fd]')}>
                          {tipoInfo?.label} · {formatCurrency(tipoInfo?.valor || 0)}
                        </span>
                        <p className="text-xs text-fg4 mt-0.5">{formatDate(demanda.data_abertura)}</p>
                      </div>
                      <Select value={demanda.status} onValueChange={v => updateDemanda.mutate({ id: demanda.id, status: v })}>
                        <SelectTrigger className={cn('w-36 h-7 text-xs', statusInfo?.color)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DEMANDA_STATUS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {deletingId === demanda.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => { deleteDemanda.mutate(demanda.id); setDeletingId(null) }} className="text-xs text-red-400 px-1.5 py-0.5 rounded border border-red-500/30">ok</button>
                          <button onClick={() => setDeletingId(null)} className="text-xs text-[rgba(130,150,170,0.55)] px-1">x</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeletingId(demanda.id)} className="text-[rgba(100,120,140,0.40)] hover:text-red-400 transition-colors p-1 rounded" title="Excluir">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {filtered.length === 0 && <div className="text-center text-fg4 py-12">Nenhuma demanda encontrada.</div>}
        </div>
      )}

      <Dialog open={showNew} onOpenChange={o => !o && setShowNew(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova Demanda</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Contrato</Label>
              <Select onValueChange={setContratoId}>
                <SelectTrigger><SelectValue placeholder="Selecione o contrato" /></SelectTrigger>
                <SelectContent>
                  {contratos?.filter(c => c.tipo === 'resgate' || c.status === 'ativo').map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.cliente?.nome} — {c.cliente?.empresa}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Título *</Label><Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Descreva a demanda" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEMANDA_TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label} — R${t.valor}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Área de Direito</Label>
                <Select onValueChange={setArea}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_AREAS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Responsável</Label><Input value={responsavel} onChange={e => setResponsavel(e.target.value)} placeholder="Membro da equipe" /></div>
            <div className="space-y-1.5"><Label>Descrição</Label><Textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Detalhes da demanda..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!contratoId || !titulo || createDemanda.isPending} className="bg-primary hover:bg-primary/90">
              {createDemanda.isPending ? 'Salvando...' : 'Criar Demanda'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
