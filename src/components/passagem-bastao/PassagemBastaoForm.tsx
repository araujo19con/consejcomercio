import { useEffect, useState } from 'react'
import { usePassagemBastao, useUpsertPassagemBastao } from '@/hooks/usePassagemBastao'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MediaUploader } from './MediaUploader'
import { Radio, Wallet, Target, Calendar } from 'lucide-react'

type Props = { leadId: string }

type FormState = {
  dores_expectativas: string
  perfil_comunicacao: string
  info_financeira: string
  prazos_marcos: string
}

const EMPTY: FormState = {
  dores_expectativas: '',
  perfil_comunicacao: '',
  info_financeira: '',
  prazos_marcos: '',
}

export function PassagemBastaoForm({ leadId }: Props) {
  const { data: passagem, isLoading } = usePassagemBastao(leadId)
  const upsert = useUpsertPassagemBastao()
  const [form, setForm] = useState<FormState>(EMPTY)

  useEffect(() => {
    if (passagem) {
      setForm({
        dores_expectativas: passagem.dores_expectativas ?? '',
        perfil_comunicacao: passagem.perfil_comunicacao ?? '',
        info_financeira: passagem.info_financeira ?? '',
        prazos_marcos: passagem.prazos_marcos ?? '',
      })
    } else {
      setForm(EMPTY)
    }
  }, [passagem])

  function handleSave() {
    upsert.mutate({
      lead_id: leadId,
      dores_expectativas: form.dores_expectativas || null,
      perfil_comunicacao: form.perfil_comunicacao || null,
      info_financeira: form.info_financeira || null,
      prazos_marcos: form.prazos_marcos || null,
    })
  }

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando dossiê...</div>

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dossiê Digital do Cliente</CardTitle>
          <p className="text-xs text-muted-foreground">
            Informações que o Closer repassa à DDGD para direcionar melhor o trabalho dos consultores.
            Quando o lead vira Ganho, esses campos vão automaticamente junto da mensagem no Slack.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field
            icon={<Target className="w-4 h-4" />}
            label="Dores e expectativas do cliente"
            hint="O que o cliente quer resolver? Qual o sucesso esperado?"
            value={form.dores_expectativas}
            onChange={(v) => setForm((p) => ({ ...p, dores_expectativas: v }))}
          />
          <Field
            icon={<Radio className="w-4 h-4" />}
            label="Perfil de comunicação / estilo"
            hint="Tom preferido (formal, direto, consultivo), canal (WhatsApp, e-mail), cadência de reuniões."
            value={form.perfil_comunicacao}
            onChange={(v) => setForm((p) => ({ ...p, perfil_comunicacao: v }))}
          />
          <Field
            icon={<Wallet className="w-4 h-4" />}
            label="Informações financeiras"
            hint="Valor acordado, parcelas, descontos concedidos, datas de pagamento, particularidades."
            value={form.info_financeira}
            onChange={(v) => setForm((p) => ({ ...p, info_financeira: v }))}
          />
          <Field
            icon={<Calendar className="w-4 h-4" />}
            label="Prazos e marcos combinados"
            hint="Datas prometidas, entregáveis do primeiro mês, data do kickoff."
            value={form.prazos_marcos}
            onChange={(v) => setForm((p) => ({ ...p, prazos_marcos: v }))}
          />

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={upsert.isPending} className="bg-primary hover:bg-primary/90">
              {upsert.isPending ? 'Salvando...' : 'Salvar dossiê'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <MediaUploader leadId={leadId} />
    </div>
  )
}

type FieldProps = {
  icon: React.ReactNode
  label: string
  hint: string
  value: string
  onChange: (v: string) => void
}

function Field({ icon, label, hint, value, onChange }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{icon}</span>
        {label}
      </Label>
      <p className="text-xs text-muted-foreground -mt-1">{hint}</p>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} />
    </div>
  )
}
