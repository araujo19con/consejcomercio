import { useState } from 'react'
import { useIndicacoes, useCreateIndicacao, useUpdateIndicacao } from '@/hooks/useIndicacoes'
import { useCreateLead } from '@/hooks/useLeads'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/query-keys'
import { useClientes } from '@/hooks/useClientes'
import { useParceiros } from '@/hooks/useParceiros'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { INDICACAO_STATUS, REWARD_TYPES } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { Plus, Gift, User, Handshake } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Indicacao } from '@/types'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

async function handleStatusChange(ind: Indicacao, newStatus: string, updateIndicacao: ReturnType<typeof useUpdateIndicacao>, createLead: ReturnType<typeof useCreateLead>, qc: ReturnType<typeof useQueryClient>) {
  if (newStatus === 'contactado' && !ind.lead_id) {
    // Auto-create a lead and link it
    const origem = ind.indicante_cliente_id ? 'indicacao_cliente' : 'indicacao_parceiro'
    try {
      // Note: don't pass referido_por_* here to avoid auto-creating a duplicate indicação
      const lead = await createLead.mutateAsync({
        nome: ind.indicado_nome,
        telefone: ind.indicado_telefone ?? '',
        empresa: ind.indicado_empresa ?? '',
        email: ind.indicado_email ?? '',
        origem,
        status: 'novo_lead',
        segmento: 'outro',
        servicos_interesse: [],
      })
      await supabase.from('indicacoes').update({ status: newStatus, lead_id: lead.id }).eq('id', ind.id)
      qc.invalidateQueries({ queryKey: QUERY_KEYS.indicacoes.all })
      toast.success('Lead criado e indicação atualizada!')
    } catch {
      toast.error('Erro ao criar lead')
    }
  } else {
    updateIndicacao.mutate({ id: ind.id, status: newStatus })
  }
}

export function IndicacoesPage() {
  const { data: indicacoes, isLoading } = useIndicacoes()
  const { data: clientes } = useClientes()
  const { data: parceiros } = useParceiros()
  const createIndicacao = useCreateIndicacao()
  const updateIndicacao = useUpdateIndicacao()
  const createLead = useCreateLead()
  const qc = useQueryClient()
  const [showNew, setShowNew] = useState(false)
  const [indicanteType, setIndicanteType] = useState<'cliente' | 'parceiro'>('cliente')
  const [indicanteClienteId, setIndicanteClienteId] = useState('')
  const [indicanteParceiroId, setIndicanteParceiroId] = useState('')
  const [indicadoNome, setIndicadoNome] = useState('')
  const [indicadoTelefone, setIndicadoTelefone] = useState('')
  const [indicadoEmpresa, setIndicadoEmpresa] = useState('')
  const [indicadoEmail, setIndicadoEmail] = useState('')
  const [tipoRecompensa, setTipoRecompensa] = useState('desconto_contrato')

  const totalIndicacoes = indicacoes?.length || 0
  const convertidas = indicacoes?.filter(i => i.status === 'convertido').length || 0
  const recompensasPendentes = indicacoes?.filter(i => i.status === 'convertido' && !i.recompensa_entregue).length || 0

  function handleCreate() {
    createIndicacao.mutate({
      indicante_cliente_id: indicanteType === 'cliente' ? indicanteClienteId || null : null,
      indicante_parceiro_id: indicanteType === 'parceiro' ? indicanteParceiroId || null : null,
      indicado_nome: indicadoNome,
      indicado_telefone: indicadoTelefone,
      indicado_empresa: indicadoEmpresa || null,
      indicado_email: indicadoEmail || null,
      lead_id: null,
      status: 'pendente',
      tipo_recompensa: tipoRecompensa,
      recompensa_descricao: null,
      recompensa_entregue: false,
      data_recompensa: null,
      notas: null,
    }, {
      onSuccess: () => {
        setShowNew(false)
        setIndicadoNome(''); setIndicadoTelefone(''); setIndicadoEmpresa(''); setIndicadoEmail('')
        setIndicanteClienteId(''); setIndicanteParceiroId('')
      }
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-800">Indicações — Clube de Parceiros</h1>
        <Button size="sm" onClick={() => setShowNew(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-1" /> Nova Indicação
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total', value: totalIndicacoes, color: 'text-slate-800' },
          { label: 'Convertidas', value: `${convertidas} (${totalIndicacoes ? Math.round((convertidas/totalIndicacoes)*100) : 0}%)`, color: 'text-green-700' },
          { label: 'Recompensas Pendentes', value: recompensasPendentes, color: 'text-amber-700' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">{label}</p>
              <p className={cn('text-2xl font-bold mt-0.5', color)}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? <div className="text-center text-slate-500 py-8">Carregando...</div> : (
        <div className="space-y-2">
          {indicacoes?.map(ind => {
            const statusInfo = INDICACAO_STATUS.find(s => s.value === ind.status)
            const indicanteNome = ind.indicante_cliente?.nome || ind.indicante_parceiro?.nome || '—'
            const indicanteTipo = ind.indicante_cliente ? 'cliente' : 'parceiro'

            return (
              <Card key={ind.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                      {indicanteTipo === 'parceiro' ? <Handshake className="w-4 h-4 text-indigo-600" /> : <User className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-slate-400">{indicanteTipo === 'cliente' ? 'Cliente' : 'Parceiro'}: <span className="font-medium text-slate-600">{indicanteNome}</span></p>
                        <span>→</span>
                        <p className="font-semibold text-slate-800">{ind.indicado_nome}</p>
                        {ind.indicado_empresa && <p className="text-xs text-slate-500">({ind.indicado_empresa})</p>}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDate(ind.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {ind.status === 'convertido' && !ind.recompensa_entregue && (
                        <Button size="sm" variant="outline" className="h-7 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                          onClick={() => updateIndicacao.mutate({ id: ind.id, recompensa_entregue: true, data_recompensa: new Date().toISOString() })}>
                          <Gift className="w-3 h-3 mr-1" /> Recompensa entregue
                        </Button>
                      )}
                      {ind.recompensa_entregue && <span className="text-xs text-green-600 flex items-center gap-1"><Gift className="w-3 h-3" /> Entregue</span>}
                      <Select value={ind.status} onValueChange={v => handleStatusChange(ind, v, updateIndicacao, createLead, qc)}>
                        <SelectTrigger className={cn('w-32 h-7 text-xs', statusInfo?.color)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INDICACAO_STATUS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {!indicacoes?.length && <div className="text-center text-slate-400 py-12">Nenhuma indicação registrada.</div>}
        </div>
      )}

      <Dialog open={showNew} onOpenChange={o => !o && setShowNew(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova Indicação</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Tipo de indicante</Label>
              <div className="flex gap-2">
                {(['cliente', 'parceiro'] as const).map(t => (
                  <Button key={t} size="sm" variant={indicanteType === t ? 'default' : 'outline'}
                    onClick={() => setIndicanteType(t)}
                    className={indicanteType === t ? 'bg-indigo-600 hover:bg-indigo-700' : ''}>
                    {t === 'cliente' ? 'Cliente' : 'Parceiro'}
                  </Button>
                ))}
              </div>
            </div>
            {indicanteType === 'cliente' ? (
              <div className="space-y-1.5">
                <Label>Cliente que indicou</Label>
                <Select onValueChange={setIndicanteClienteId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent>
                    {clientes?.map(c => <SelectItem key={c.id} value={c.id}>{c.nome} — {c.empresa}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Parceiro que indicou</Label>
                <Select onValueChange={setIndicanteParceiroId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o parceiro" /></SelectTrigger>
                  <SelectContent>
                    {parceiros?.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Nome do indicado *</Label><Input value={indicadoNome} onChange={e => setIndicadoNome(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Telefone *</Label><Input value={indicadoTelefone} onChange={e => setIndicadoTelefone(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Empresa</Label><Input value={indicadoEmpresa} onChange={e => setIndicadoEmpresa(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input value={indicadoEmail} onChange={e => setIndicadoEmail(e.target.value)} type="email" /></div>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de recompensa</Label>
              <Select value={tipoRecompensa} onValueChange={setTipoRecompensa}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REWARD_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!indicadoNome || !indicadoTelefone || createIndicacao.isPending} className="bg-indigo-600 hover:bg-indigo-700">
              {createIndicacao.isPending ? 'Salvando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
