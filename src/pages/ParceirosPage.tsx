import { useState } from 'react'
import { useParceiros, useCreateParceiro, useUpdateParceiro } from '@/hooks/useParceiros'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { PARCEIRO_TIPOS } from '@/lib/constants'
import { Plus, Handshake, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

const PARCEIRO_STATUS = [
  { value: 'ativo', label: 'Ativo', color: 'bg-green-100 text-green-700' },
  { value: 'potencial', label: 'Potencial', color: 'bg-amber-100 text-amber-700' },
  { value: 'inativo', label: 'Inativo', color: 'bg-slate-100 text-slate-500' },
]

export function ParceirosPage() {
  const { data: parceiros, isLoading } = useParceiros()
  const createParceiro = useCreateParceiro()
  const updateParceiro = useUpdateParceiro()
  const [showNew, setShowNew] = useState(false)
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('empresa_junior')
  const [status, setStatus] = useState('ativo')
  const [contatoNome, setContatoNome] = useState('')
  const [contatoEmail, setContatoEmail] = useState('')
  const [contatoPhone, setContatoPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [notas, setNotas] = useState('')

  function handleCreate() {
    createParceiro.mutate({
      nome, tipo, status,
      contato_nome: contatoNome || null,
      contato_email: contatoEmail || null,
      contato_phone: contatoPhone || null,
      website: website || null,
      notas: notas || null,
    }, {
      onSuccess: () => {
        setShowNew(false)
        setNome(''); setContatoNome(''); setContatoEmail(''); setContatoPhone(''); setWebsite(''); setNotas('')
      }
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-800">Parceiros</h1>
        <Button size="sm" onClick={() => setShowNew(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-1" /> Novo Parceiro
        </Button>
      </div>

      {isLoading ? <div className="text-center text-slate-500 py-8">Carregando...</div> : (
        <div className="grid grid-cols-2 gap-3">
          {parceiros?.map(parceiro => {
            const tipoInfo = PARCEIRO_TIPOS.find(t => t.value === parceiro.tipo)
            const statusInfo = PARCEIRO_STATUS.find(s => s.value === parceiro.status)
            return (
              <Card key={parceiro.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                        <Handshake className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{parceiro.nome}</p>
                        <p className="text-xs text-slate-500">{tipoInfo?.label}</p>
                      </div>
                    </div>
                    {statusInfo && (
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusInfo.color)}>
                        {statusInfo.label}
                      </span>
                    )}
                  </div>
                  {parceiro.contato_nome && <p className="text-xs text-slate-600 mt-2">Contato: {parceiro.contato_nome}</p>}
                  {parceiro.contato_email && <p className="text-xs text-slate-400">{parceiro.contato_email}</p>}
                  {parceiro.website && (
                    <a href={parceiro.website} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 flex items-center gap-1 mt-1 hover:underline">
                      <Globe className="w-3 h-3" /> {parceiro.website}
                    </a>
                  )}
                </CardContent>
              </Card>
            )
          })}
          {!parceiros?.length && <div className="col-span-2 text-center text-slate-400 py-12">Nenhum parceiro cadastrado.</div>}
        </div>
      )}

      <Dialog open={showNew} onOpenChange={o => !o && setShowNew(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Parceiro</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Nome *</Label><Input value={nome} onChange={e => setNome(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo (IPP)</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PARCEIRO_TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PARCEIRO_STATUS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Contato</Label><Input value={contatoNome} onChange={e => setContatoNome(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Telefone</Label><Input value={contatoPhone} onChange={e => setContatoPhone(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input value={contatoEmail} onChange={e => setContatoEmail(e.target.value)} type="email" /></div>
              <div className="space-y-1.5"><Label>Website</Label><Input value={website} onChange={e => setWebsite(e.target.value)} /></div>
            </div>
            <div className="space-y-1.5"><Label>Observações</Label><Textarea value={notas} onChange={e => setNotas(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!nome || createParceiro.isPending} className="bg-indigo-600 hover:bg-indigo-700">
              {createParceiro.isPending ? 'Salvando...' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
