import { useParams, useNavigate } from 'react-router-dom'
import { useLeads, useUpdateLead } from '@/hooks/useLeads'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { STAGE_COLORS, LEAD_SOURCE_LABELS, SEGMENTS, PIPELINE_STAGES } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { ArrowLeft, Stethoscope } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { Lead } from '@/types'
import { cn } from '@/lib/utils'
import { DiagnosticForm } from '@/components/diagnostico/DiagnosticForm'
import { DiagnosticPreview } from '@/components/diagnostico/DiagnosticPreview'

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: leads } = useLeads()
  const updateLead = useUpdateLead()
  const lead = leads?.find(l => l.id === id)

  const [editing, setEditing] = useState<Partial<Lead>>({})

  useEffect(() => {
    if (lead) setEditing(lead)
  }, [lead])

  if (!lead) return <div className="text-slate-500">Lead não encontrado.</div>

  function handleSave() {
    if (!lead) return
    updateLead.mutate({ id: lead.id, ...editing })
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm mb-5">
        <button onClick={() => navigate('/leads')} className="text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Leads
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-slate-700 font-medium truncate">{lead.nome}</span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{lead.nome}</h1>
          <p className="text-sm text-slate-500">{lead.empresa}</p>
        </div>
        <span className={cn('ml-auto text-xs font-medium px-2.5 py-1 rounded-full border', STAGE_COLORS[lead.status])}>
          {PIPELINE_STAGES.find(s => s.id === lead.status)?.label}
        </span>
      </div>

      <Tabs defaultValue="info">
        <TabsList className="mb-4">
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="diagnostico">Diagnóstico</TabsTrigger>
          <TabsTrigger value="proposta">Proposta</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader><CardTitle className="text-base">Dados do Lead</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input value={editing.nome || ''} onChange={e => setEditing(p => ({ ...p, nome: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefone</Label>
                  <Input value={editing.telefone || ''} onChange={e => setEditing(p => ({ ...p, telefone: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Empresa</Label>
                  <Input value={editing.empresa || ''} onChange={e => setEditing(p => ({ ...p, empresa: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={editing.email || ''} onChange={e => setEditing(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Segmento</Label>
                  <Select value={editing.segmento || ''} onValueChange={v => setEditing(p => ({ ...p, segmento: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SEGMENTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Origem</Label>
                  <Input value={LEAD_SOURCE_LABELS[lead.origem] || lead.origem} disabled className="bg-slate-50" />
                </div>
                <div className="space-y-1.5">
                  <Label>Responsável</Label>
                  <Input value={editing.responsavel || ''} onChange={e => setEditing(p => ({ ...p, responsavel: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Data do Diagnóstico</Label>
                  <Input type="datetime-local" value={editing.data_diagnostico ? editing.data_diagnostico.slice(0, 16) : ''} onChange={e => setEditing(p => ({ ...p, data_diagnostico: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Observações</Label>
                <Textarea value={editing.notas || ''} onChange={e => setEditing(p => ({ ...p, notas: e.target.value }))} rows={3} />
              </div>
              {lead.motivo_perda && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                  <p className="text-xs font-medium text-red-700">Motivo da perda:</p>
                  <p className="text-sm text-red-800 mt-0.5">{lead.motivo_perda}</p>
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={updateLead.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                  {updateLead.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diagnostico">
          {lead.diagnostico?.completed_at ? (
            <DiagnosticPreview diagnostico={lead.diagnostico} onRedo={() => {}} />
          ) : (
            <DiagnosticForm leadId={lead.id} existingAnswers={lead.diagnostico} />
          )}
        </TabsContent>

        <TabsContent value="proposta">
          <Card>
            <CardHeader><CardTitle className="text-base">Proposta</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <Label>Valor de Investimento Estimado</Label>
                <Input
                  value={editing.investimento_estimado || ''}
                  onChange={e => setEditing(p => ({ ...p, investimento_estimado: e.target.value }))}
                  placeholder="Ex: R$ 2.000 - R$ 5.000"
                />
              </div>
              <div className="space-y-1.5 mt-4">
                <Label>Observações da proposta</Label>
                <Textarea
                  value={editing.notas || ''}
                  onChange={e => setEditing(p => ({ ...p, notas: e.target.value }))}
                  placeholder="Detalhes da proposta enviada..."
                  rows={5}
                />
              </div>
              <div className="flex justify-end mt-4">
                <Button onClick={handleSave} disabled={updateLead.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                  Salvar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
