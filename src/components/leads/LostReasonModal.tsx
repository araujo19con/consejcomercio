import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const LOSS_REASONS = [
  'Orçamento insuficiente',
  'Escolheu concorrente',
  'Não viu valor no serviço',
  'Momento inadequado',
  'Não respondeu mais',
  'Serviço não adequado à necessidade',
  'Outro',
]

type Props = {
  open: boolean
  onConfirm: (motivo: string) => void
  onCancel: () => void
}

export function LostReasonModal({ open, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState('')
  const [custom, setCustom] = useState('')

  function handleConfirm() {
    const motivo = reason === 'Outro' ? custom : reason
    if (!motivo.trim()) return
    onConfirm(motivo)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Motivo da perda</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Por que esse lead foi perdido?</Label>
            <Select onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {LOSS_REASONS.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {reason === 'Outro' && (
            <div className="space-y-1.5">
              <Label>Descreva o motivo</Label>
              <Textarea value={custom} onChange={e => setCustom(e.target.value)} placeholder="Descreva o motivo da perda..." />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!reason} className="bg-red-600 hover:bg-red-700">
            Confirmar perda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
