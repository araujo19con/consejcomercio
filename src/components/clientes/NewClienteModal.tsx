import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useCreateCliente } from '@/hooks/useClientes'
import { SEGMENTS, CLIENT_STATUS_OPTIONS } from '@/lib/constants'

type Props = {
  open: boolean
  onClose: () => void
  onCreated?: (id: string) => void
}

export function NewClienteModal({ open, onClose, onCreated }: Props) {
  const createCliente = useCreateCliente()
  const [nome, setNome] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [segmento, setSegmento] = useState('outro')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('ativo')
  const [notas, setNotas] = useState('')

  function handleClose() {
    setNome(''); setEmpresa(''); setSegmento('outro'); setTelefone('')
    setEmail(''); setStatus('ativo'); setNotas('')
    onClose()
  }

  function handleSubmit() {
    if (!nome.trim() || !empresa.trim()) return
    createCliente.mutate(
      { nome: nome.trim(), empresa: empresa.trim(), segmento, telefone: telefone || null, email: email || null, status, notas: notas || null },
      {
        onSuccess: (cliente) => {
          handleClose()
          onCreated?.(cliente.id)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input placeholder="Nome do responsável" value={nome} onChange={e => setNome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Empresa *</Label>
            <Input placeholder="Nome da empresa" value={empresa} onChange={e => setEmpresa(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Segmento</Label>
              <Select value={segmento} onValueChange={setSegmento}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEGMENTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLIENT_STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input placeholder="(00) 00000-0000" value={telefone} onChange={e => setTelefone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="email@empresa.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea placeholder="Informações adicionais..." value={notas} onChange={e => setNotas(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={createCliente.isPending || !nome.trim() || !empresa.trim()}
            style={{ backgroundColor: '#0089ac' }}
            className="text-white"
          >
            {createCliente.isPending ? 'Salvando...' : 'Criar Cliente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
