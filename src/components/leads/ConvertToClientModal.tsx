import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateCliente } from '@/hooks/useClientes'
import { useCreateContrato } from '@/hooks/useContratos'
import { useUpdateLeadStatus } from '@/hooks/useLeads'
import { CONTRACT_TYPES, PRICING_MODELS, SERVICE_AREAS } from '@/lib/constants'
import type { Lead } from '@/types'

type Props = {
  lead: Lead
  open: boolean
  onClose: () => void
  targetStage?: string
}

export function ConvertToClientModal({ lead, open, onClose, targetStage = 'ganho_assessoria' }: Props) {
  const createCliente = useCreateCliente()
  const createContrato = useCreateContrato()
  const updateStatus = useUpdateLeadStatus()

  const [tipoContrato, setTipoContrato] = useState('assessoria')
  const [modelo, setModelo] = useState('assessoria_12m')
  const [areas, setAreas] = useState<string[]>([])
  const [valorTotal, setValorTotal] = useState('')
  const [valorMensal, setValorMensal] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [loading, setLoading] = useState(false)

  function toggleArea(value: string) {
    setAreas(prev => prev.includes(value) ? prev.filter(a => a !== value) : [...prev, value])
  }

  async function handleSubmit() {
    setLoading(true)
    try {
      const cliente = await createCliente.mutateAsync({
        lead_id: lead.id,
        nome: lead.nome,
        empresa: lead.empresa,
        segmento: lead.segmento,
        telefone: lead.telefone || undefined,
        email: lead.email || undefined,
        status: 'ativo',
        notas: lead.notas || undefined,
      })
      await createContrato.mutateAsync({
        cliente_id: cliente.id,
        tipo: tipoContrato,
        modelo_precificacao: modelo,
        areas_direito: areas,
        valor_total: valorTotal ? parseFloat(valorTotal) : null,
        valor_mensal: valorMensal ? parseFloat(valorMensal) : null,
        data_inicio: dataInicio || null,
        data_fim: dataFim || null,
        status: 'ativo',
        rm_status: 'verificar',
        notas: null,
      })
      await updateStatus.mutateAsync({ id: lead.id, status: targetStage })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Converter em Cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="p-3 bg-indigo-50 rounded-lg">
            <p className="text-sm font-medium text-indigo-800">{lead.nome}</p>
            <p className="text-xs text-indigo-600">{lead.empresa}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo de Contrato</Label>
              <Select value={tipoContrato} onValueChange={setTipoContrato}>
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
                <button
                  key={a.value}
                  type="button"
                  onClick={() => toggleArea(a.value)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    areas.includes(a.value)
                      ? 'text-white border-primary bg-primary'
                      : 'bg-[var(--alpha-bg-xs)] text-muted-foreground border-[var(--alpha-border-md)] hover:border-primary/50'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor Total (R$)</Label>
              <Input type="number" value={valorTotal} onChange={e => setValorTotal(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-1.5">
              <Label>Valor Mensal (R$)</Label>
              <Input type="number" value={valorMensal} onChange={e => setValorMensal(e.target.value)} placeholder="0,00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Início</Label>
              <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fim</Label>
              <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-green-600 hover:bg-green-700">
            {loading ? 'Convertendo...' : 'Confirmar Conversão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
