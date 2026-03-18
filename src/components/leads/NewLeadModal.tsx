import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateLead } from '@/hooks/useLeads'
import { useClientes } from '@/hooks/useClientes'
import { useParceiros } from '@/hooks/useParceiros'
import { LEAD_SOURCES, SEGMENTS } from '@/lib/constants'

const schema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  empresa: z.string().min(1, 'Empresa obrigatória'),
  segmento: z.string().min(1, 'Segmento obrigatório'),
  telefone: z.string().min(8, 'Telefone obrigatório'),
  email: z.string().email().optional().or(z.literal('')),
  origem: z.string().min(1, 'Origem obrigatória'),
  responsavel: z.string().optional(),
  notas: z.string().optional(),
})

type FormData = z.infer<typeof schema>

type Props = {
  open: boolean
  onClose: () => void
}

export function NewLeadModal({ open, onClose }: Props) {
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })
  const [referenteClienteId, setReferenteClienteId] = useState('')
  const [referenteParceiroId, setReferenteParceiroId] = useState('')

  const origem = watch('origem') ?? ''
  const segmento = watch('segmento') ?? ''

  const createLead = useCreateLead()
  const { data: clientes } = useClientes()
  const { data: parceiros } = useParceiros()

  function onSubmit(data: FormData) {
    createLead.mutate({
      ...data,
      email: data.email || null,
      notas: data.notas || null,
      responsavel: data.responsavel || null,
      status: 'classificacao',
      referido_por_cliente_id: origem === 'indicacao_cliente' ? referenteClienteId || null : null,
      referido_por_parceiro_id: origem === 'indicacao_parceiro' ? referenteParceiroId || null : null,
      servicos_interesse: [],
      data_diagnostico: null,
      motivo_perda: null,
      investimento_estimado: null,
    }, {
      onSuccess: () => {
        reset()
        setReferenteClienteId('')
        setReferenteParceiroId('')
        onClose()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input {...register('nome')} placeholder="Nome do contato" />
              {errors.nome && <p className="text-xs text-red-500">{errors.nome.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Telefone *</Label>
              <Input {...register('telefone')} placeholder="(11) 99999-0000" />
              {errors.telefone && <p className="text-xs text-red-500">{errors.telefone.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Empresa *</Label>
              <Input {...register('empresa')} placeholder="Nome da empresa" />
              {errors.empresa && <p className="text-xs text-red-500">{errors.empresa.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input {...register('email')} type="email" placeholder="email@empresa.com" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Segmento *</Label>
              <Select onValueChange={(v) => setValue('segmento', v, { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {SEGMENTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.segmento && <p className="text-xs text-red-500">{errors.segmento.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Como chegou até nós? *</Label>
              <Select onValueChange={(v) => setValue('origem', v, { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Origem" /></SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.origem && <p className="text-xs text-red-500">{errors.origem.message}</p>}
            </div>
          </div>

          {/* Referral fields — only shown for indicacao origins */}
          {origem === 'indicacao_cliente' && (
            <div className="space-y-1.5 p-3 bg-indigo-50 rounded-lg">
              <Label>Cliente que fez a indicação</Label>
              <Select onValueChange={setReferenteClienteId}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {clientes?.map(c => <SelectItem key={c.id} value={c.id}>{c.nome} — {c.empresa}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {origem === 'indicacao_parceiro' && (
            <div className="space-y-1.5 p-3 bg-indigo-50 rounded-lg">
              <Label>Parceiro que fez a indicação</Label>
              <Select onValueChange={setReferenteParceiroId}>
                <SelectTrigger><SelectValue placeholder="Selecione o parceiro" /></SelectTrigger>
                <SelectContent>
                  {parceiros?.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Responsável</Label>
            <Input {...register('responsavel')} placeholder="Nome do membro da equipe" />
          </div>

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea {...register('notas')} placeholder="Informações adicionais sobre o lead..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={createLead.isPending || !origem || !segmento} className="bg-indigo-600 hover:bg-indigo-700">
              {createLead.isPending ? 'Criando...' : 'Criar Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
