import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useCreateContrato } from '@/hooks/useContratos'
import { CONTRACT_TYPES, PRICING_MODELS, SERVICE_AREAS, RM_STATUS_OPTIONS } from '@/lib/constants'

type Props = {
  clienteId: string
  open: boolean
  onClose: () => void
}

export function NewContratoModal({ clienteId, open, onClose }: Props) {
  const createContrato = useCreateContrato()
  const [tipo, setTipo] = useState('assessoria')
  const [modelo, setModelo] = useState('assessoria_12m')
  const [areas, setAreas] = useState<string[]>([])
  const [valorTotal, setValorTotal] = useState('')
  const [valorMensal, setValorMensal] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [rmStatus, setRmStatus] = useState('verificar')
  const [notas, setNotas] = useState('')

  function toggleArea(value: string) {
    setAreas(prev => prev.includes(value) ? prev.filter(a => a !== value) : [...prev, value])
  }

  function handleSubmit() {
    createContrato.mutate({
      cliente_id: clienteId,
      tipo,
      modelo_precificacao: modelo,
      areas_direito: areas,
      valor_total: valorTotal ? parseFloat(valorTotal) : null,
      valor_mensal: valorMensal ? parseFloat(valorMensal) : null,
      data_inicio: dataInicio || null,
      data_fim: dataFim || null,
      status: 'ativo',
      rm_status: rmStatus,
      notas: notas || null,
    }, { onSuccess: onClose })
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Contrato</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTRACT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Modelo</Label>
              <Select value={modelo} onValueChange={setModelo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRICING_MODELS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Áreas de Direito</Label>
            <div className="flex flex-wrap gap-1.5">
              {SERVICE_AREAS.map(a => (
                <button key={a.value} type="button" onClick={() => toggleArea(a.value)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${areas.includes(a.value) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Valor Total (R$)</Label><Input type="number" value={valorTotal} onChange={e => setValorTotal(e.target.value)} placeholder="0,00" /></div>
            <div className="space-y-1.5"><Label>Valor Mensal (R$)</Label><Input type="number" value={valorMensal} onChange={e => setValorMensal(e.target.value)} placeholder="0,00" /></div>
            <div className="space-y-1.5"><Label>Data Início</Label><Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Data Fim</Label><Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} /></div>
          </div>

          <div className="space-y-1.5">
            <Label>Status RM (Registro de Marca)</Label>
            <Select value={rmStatus} onValueChange={setRmStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RM_STATUS_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5"><Label>Observações</Label><Textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Detalhes do contrato..." /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createContrato.isPending} className="bg-indigo-600 hover:bg-indigo-700">
            {createContrato.isPending ? 'Salvando...' : 'Criar Contrato'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
