import { useState } from 'react'
import { useParceiros, useCreateParceiro, useUpdateParceiro, useDeleteParceiro } from '@/hooks/useParceiros'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { PARCEIRO_TIPOS } from '@/lib/constants'
import { Plus, Handshake, Globe, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Parceiro } from '@/types'

const PARCEIRO_STATUS = [
  { value: 'ativo', label: 'Ativo', color: 'bg-[rgba(16,185,129,0.15)] text-[#34d399]' },
  { value: 'potencial', label: 'Potencial', color: 'bg-[rgba(245,158,11,0.15)] text-[#fbbf24]' },
  { value: 'inativo', label: 'Inativo', color: 'bg-[rgba(255,255,255,0.04)] text-muted-foreground' },
]

function useParceiroForm(initial?: Parceiro) {
  const [nome, setNome] = useState(initial?.nome ?? '')
  const [tipo, setTipo] = useState(initial?.tipo ?? 'empresa_junior')
  const [status, setStatus] = useState(initial?.status ?? 'ativo')
  const [contatoNome, setContatoNome] = useState(initial?.contato_nome ?? '')
  const [contatoEmail, setContatoEmail] = useState(initial?.contato_email ?? '')
  const [contatoPhone, setContatoPhone] = useState(initial?.contato_phone ?? '')
  const [website, setWebsite] = useState(initial?.website ?? '')
  const [notas, setNotas] = useState(initial?.notas ?? '')
  function reset() { setNome(''); setTipo('empresa_junior'); setStatus('ativo'); setContatoNome(''); setContatoEmail(''); setContatoPhone(''); setWebsite(''); setNotas('') }
  function fill(p: Parceiro) { setNome(p.nome); setTipo(p.tipo); setStatus(p.status); setContatoNome(p.contato_nome ?? ''); setContatoEmail(p.contato_email ?? ''); setContatoPhone(p.contato_phone ?? ''); setWebsite(p.website ?? ''); setNotas(p.notas ?? '') }
  return { nome, setNome, tipo, setTipo, status, setStatus, contatoNome, setContatoNome, contatoEmail, setContatoEmail, contatoPhone, setContatoPhone, website, setWebsite, notas, setNotas, reset, fill }
}

function ParceiroForm({ f }: { f: ReturnType<typeof useParceiroForm> }) {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5"><Label>Nome *</Label><Input value={f.nome} onChange={e => f.setNome(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Tipo (IPP)</Label>
          <Select value={f.tipo} onValueChange={f.setTipo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PARCEIRO_TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={f.status} onValueChange={f.setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PARCEIRO_STATUS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Contato</Label><Input value={f.contatoNome} onChange={e => f.setContatoNome(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Telefone</Label><Input value={f.contatoPhone} onChange={e => f.setContatoPhone(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Email</Label><Input value={f.contatoEmail} onChange={e => f.setContatoEmail(e.target.value)} type="email" /></div>
        <div className="space-y-1.5"><Label>Website</Label><Input value={f.website} onChange={e => f.setWebsite(e.target.value)} /></div>
      </div>
      <div className="space-y-1.5"><Label>Observações</Label><Textarea value={f.notas} onChange={e => f.setNotas(e.target.value)} /></div>
    </div>
  )
}

export function ParceirosPage() {
  const { data: parceiros, isLoading } = useParceiros()
  const createParceiro = useCreateParceiro()
  const updateParceiro = useUpdateParceiro()
  const deleteParceiro = useDeleteParceiro()
  const [showNew, setShowNew] = useState(false)
  const [editParceiro, setEditParceiro] = useState<Parceiro | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const newForm = useParceiroForm()
  const editForm = useParceiroForm()

  function handleCreate() {
    const f = newForm
    createParceiro.mutate({
      nome: f.nome, tipo: f.tipo, status: f.status,
      contato_nome: f.contatoNome || null,
      contato_email: f.contatoEmail || null,
      contato_phone: f.contatoPhone || null,
      website: f.website || null,
      notas: f.notas || null,
    }, {
      onSuccess: () => { setShowNew(false); newForm.reset() }
    })
  }

  function handleEdit(p: Parceiro) {
    editForm.fill(p)
    setEditParceiro(p)
  }

  function handleUpdate() {
    if (!editParceiro) return
    const f = editForm
    updateParceiro.mutate({
      id: editParceiro.id,
      nome: f.nome, tipo: f.tipo, status: f.status,
      contato_nome: f.contatoNome || null,
      contato_email: f.contatoEmail || null,
      contato_phone: f.contatoPhone || null,
      website: f.website || null,
      notas: f.notas || null,
    }, {
      onSuccess: () => setEditParceiro(null)
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">Parceiros</h1>
        <Button size="sm" onClick={() => setShowNew(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1" /> Novo Parceiro
        </Button>
      </div>

      {isLoading ? <div className="text-center text-muted-foreground py-8">Carregando...</div> : (
        <div className="grid grid-cols-2 gap-3">
          {parceiros?.map(parceiro => {
            const tipoInfo = PARCEIRO_TIPOS.find(t => t.value === parceiro.tipo)
            const statusInfo = PARCEIRO_STATUS.find(s => s.value === parceiro.status)
            return (
              <Card key={parceiro.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,137,172,0.20)' }}>
                        <Handshake className="w-4 h-4 text-[#6bd0e7]" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{parceiro.nome}</p>
                        <p className="text-xs text-muted-foreground">{tipoInfo?.label}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {statusInfo && (
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusInfo.color)}>
                          {statusInfo.label}
                        </span>
                      )}
                      <button onClick={() => handleEdit(parceiro)} className="p-1 rounded hover:bg-[rgba(255,255,255,0.04)] text-fg4">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {deletingId === parceiro.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => { deleteParceiro.mutate(parceiro.id); setDeletingId(null) }} className="text-xs text-red-400 px-1.5 py-0.5 rounded border border-red-500/30">ok</button>
                          <button onClick={() => setDeletingId(null)} className="text-xs text-muted-foreground px-1">x</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeletingId(parceiro.id)} className="p-1 rounded hover:bg-[rgba(255,255,255,0.04)] text-fg4 hover:text-red-400 transition-colors" title="Excluir">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {parceiro.contato_nome && <p className="text-xs text-muted-foreground mt-2">Contato: {parceiro.contato_nome}</p>}
                  {parceiro.contato_email && <p className="text-xs text-fg4">{parceiro.contato_email}</p>}
                  {parceiro.website && (
                    <a href={parceiro.website} target="_blank" rel="noopener noreferrer" className="text-xs text-[#6bd0e7] flex items-center gap-1 mt-1 hover:underline">
                      <Globe className="w-3 h-3" /> {parceiro.website}
                    </a>
                  )}
                </CardContent>
              </Card>
            )
          })}
          {!parceiros?.length && <div className="col-span-2 text-center text-fg4 py-12">Nenhum parceiro cadastrado.</div>}
        </div>
      )}

      <Dialog open={showNew} onOpenChange={o => !o && setShowNew(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Parceiro</DialogTitle></DialogHeader>
          <ParceiroForm f={newForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newForm.nome || createParceiro.isPending} className="bg-primary hover:bg-primary/90">
              {createParceiro.isPending ? 'Salvando...' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editParceiro} onOpenChange={o => !o && setEditParceiro(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Parceiro</DialogTitle></DialogHeader>
          <ParceiroForm f={editForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditParceiro(null)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={!editForm.nome || updateParceiro.isPending} className="bg-primary hover:bg-primary/90">
              {updateParceiro.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
