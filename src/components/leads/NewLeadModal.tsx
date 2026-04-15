import { useState, useEffect } from 'react'
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
import { usePerfis } from '@/hooks/usePerfis'
import { LEAD_SOURCES, SEGMENTS, ESTADOS_BR } from '@/lib/constants'
import { getUFFromPhone } from '@/lib/utils'

const schema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  empresa: z.string().min(1, 'Empresa obrigatória'),
  segmento: z.string().min(1, 'Segmento obrigatório'),
  telefone: z.string().min(8, 'Telefone obrigatório'),
  email: z.string().email().optional().or(z.literal('')),
  origem: z.string().min(1, 'Origem obrigatória'),
  estado: z.string().optional(),
  responsavel: z.string().optional(),
  notas: z.string().optional(),
})

type FormData = z.infer<typeof schema>

type Props = {
  open: boolean
  onClose: () => void
  prefill?: {
    nome?: string
    empresa?: string
    telefone?: string
    email?: string
    origem?: string
    notas?: string
  }
}

export function NewLeadModal({ open, onClose, prefill }: Props) {
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  // Pre-fill form when opening with Slack-detected data
  useEffect(() => {
    if (open && prefill) {
      reset({
        nome:     prefill.nome     ?? '',
        empresa:  prefill.empresa  ?? '',
        telefone: prefill.telefone ?? '',
        email:    prefill.email    ?? '',
        origem:   prefill.origem   ?? '',
        notas:    prefill.notas    ?? '',
        segmento: '',
        estado:   '',
        responsavel: '',
      })
      if (prefill.origem) setValue('origem', prefill.origem, { shouldValidate: false })
    }
    if (!open) reset()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  const [referenteClienteId, setReferenteClienteId] = useState('')
  const [referenteParceiroId, setReferenteParceiroId] = useState('')

  const origem  = watch('origem')   ?? ''
  const segmento = watch('segmento') ?? ''
  const telefone = watch('telefone') ?? ''
  const estado   = watch('estado')   ?? ''

  // Auto-detect UF from DDD whenever telefone changes
  useEffect(() => {
    const uf = getUFFromPhone(telefone)
    if (uf && !estado) setValue('estado', uf)
  }, [telefone]) // eslint-disable-line react-hooks/exhaustive-deps

  const createLead = useCreateLead()
  const { data: clientes } = useClientes()
  const { data: parceiros } = useParceiros()
  const { data: perfis = [] } = usePerfis()

  // Responsável: controlled separately so we can set both name + id
  const [responsavelId, setResponsavelId] = useState('')

  function onSubmit(data: FormData) {
    const selectedPerfil = perfis.find(p => p.id === responsavelId)
    createLead.mutate({
      ...data,
      email: data.email || null,
      estado: data.estado || null,
      notas: data.notas || null,
      responsavel: selectedPerfil?.nome ?? data.responsavel ?? null,
      responsavel_id: responsavelId || null,
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
        setResponsavelId('')
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

          <div className="space-y-1.5">
            <Label>Estado (UF) <span style={{ color: 'var(--cyan-mid)', fontSize: 10 }}>detectado pelo DDD</span></Label>
            <Select value={estado || undefined} onValueChange={(v) => setValue('estado', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione ou detectado pelo DDD" /></SelectTrigger>
              <SelectContent>
                {ESTADOS_BR.map(s => <SelectItem key={s.uf} value={s.uf}>{s.uf} — {s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Referral fields — only shown for indicacao origins */}
          {origem === 'indicacao_cliente' && (
            <div className="space-y-1.5 p-3 rounded-lg" style={{ background: 'rgba(0,137,172,0.08)', border: '1px solid rgba(0,137,172,0.20)' }}>
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
            <div className="space-y-1.5 p-3 rounded-lg" style={{ background: 'rgba(0,137,172,0.08)', border: '1px solid rgba(0,137,172,0.20)' }}>
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
            <Select value={responsavelId} onValueChange={setResponsavelId}>
              <SelectTrigger><SelectValue placeholder="Membro da equipe" /></SelectTrigger>
              <SelectContent>
                {perfis.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}{p.cargo ? ` — ${p.cargo}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea {...register('notas')} placeholder="Informações adicionais sobre o lead..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={createLead.isPending || !origem || !segmento} className="bg-primary hover:bg-primary/90">
              {createLead.isPending ? 'Criando...' : 'Criar Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
