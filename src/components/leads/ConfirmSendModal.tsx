import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MessageCircle, ArrowRight, Copy, Mail, Linkedin, Smartphone } from 'lucide-react'
import type { Channel, Stage } from '@/pages/MensagensPage'
import { PIPELINE_STAGES } from '@/lib/constants'
import { useCreateInteracao } from '@/hooks/useInteracoes'
import { useUpdateLeadStatus } from '@/hooks/useLeads'
import { useMeuPerfil } from '@/hooks/usePerfis'
import { getSuggestedStatus } from '@/lib/mensagens-rules'
import { toast } from 'sonner'
import { useState } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  lead: { id: string; nome: string; status: string; telefone?: string | null } | null
  channel: Channel
  stageMsg: Stage
  setor: string
  variacaoIdx: number
  assunto?: string
  corpo: string
  /**
   * "send" mode: abre link externo (wa.me) após confirmação.
   * "copy" mode: copia para clipboard após confirmação.
   */
  mode: 'send' | 'copy'
  /** URL para abrir em mode=send */
  externalUrl?: string
}

const CHANNEL_META: Record<Channel, { icon: typeof Smartphone; label: string; color: string }> = {
  whatsapp: { icon: Smartphone, label: 'WhatsApp', color: '#25D366' },
  email:    { icon: Mail,       label: 'E-mail',   color: '#3b82f6' },
  linkedin: { icon: Linkedin,   label: 'LinkedIn', color: '#0a66c2' },
}

function stageLabel(id: string): string {
  return PIPELINE_STAGES.find(s => s.id === id)?.label ?? id
}

export function ConfirmSendModal({
  open, onClose, lead, channel, stageMsg, setor, variacaoIdx,
  assunto, corpo, mode, externalUrl,
}: Props) {
  const createInteracao = useCreateInteracao()
  const updateStatus    = useUpdateLeadStatus()
  const { data: meuPerfil } = useMeuPerfil()
  const [busy, setBusy] = useState(false)

  if (!lead) return null

  const suggested = getSuggestedStatus(lead.status, stageMsg)
  const currentLabel   = stageLabel(lead.status)
  const suggestedLabel = suggested ? stageLabel(suggested) : null
  const channelMeta = CHANNEL_META[channel]
  const Icon = channelMeta.icon

  async function registerInteracao(advance: boolean) {
    if (!lead) return
    setBusy(true)
    try {
      await createInteracao.mutateAsync({
        lead_id: lead.id,
        canal: channel,
        stage_msg: stageMsg,
        setor,
        variacao_idx: variacaoIdx,
        assunto: channel === 'email' ? assunto ?? null : null,
        corpo,
        telefone_usado: channel === 'whatsapp' ? lead.telefone ?? null : null,
        pipeline_antes: lead.status,
        pipeline_depois: advance && suggested ? suggested : lead.status,
        enviada_por_id: meuPerfil?.id ?? null,
        enviada_por: meuPerfil?.nome ?? null,
      })

      if (advance && suggested) {
        await updateStatus.mutateAsync({ id: lead.id, status: suggested })
      }

      if (mode === 'send' && externalUrl) {
        window.open(externalUrl, '_blank', 'noopener,noreferrer')
        toast.success(advance && suggested ? `Enviado — lead movido para ${suggestedLabel}` : 'Envio registrado')
      } else if (mode === 'copy') {
        await navigator.clipboard.writeText(
          channel === 'email' && assunto ? `Assunto: ${assunto}\n\n${corpo}` : corpo
        )
        toast.success(advance && suggested ? `Copiado — lead movido para ${suggestedLabel}` : 'Copiado e registrado')
      }

      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao registrar envio')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5" style={{ color: channelMeta.color }} />
            Registrar {mode === 'send' ? 'envio' : 'cópia'} — {channelMeta.label}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Lead info */}
          <div className="p-3 rounded-lg" style={{ background: 'var(--alpha-bg-xs)', border: '1px solid var(--alpha-border)' }}>
            <p className="text-xs text-fg4">Lead</p>
            <p className="text-sm font-semibold text-foreground">{lead.nome}</p>
          </div>

          {/* Status transition */}
          {suggested ? (
            <div className="p-3 rounded-lg border" style={{ background: 'rgba(0,137,172,0.06)', borderColor: 'rgba(0,137,172,0.25)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--cyan-hi)' }}>
                Sugestão: avançar o lead no pipeline
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="px-2 py-0.5 rounded border text-xs" style={{ background: 'var(--alpha-bg-sm)' }}>
                  {currentLabel}
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <span className="px-2 py-0.5 rounded border text-xs" style={{ background: 'rgba(0,137,172,0.12)', borderColor: 'rgba(0,137,172,0.40)', color: 'var(--cyan-hi)' }}>
                  {suggestedLabel}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg text-xs text-muted-foreground" style={{ background: 'var(--alpha-bg-xs)', border: '1px solid var(--alpha-border)' }}>
              Não há avanço de status sugerido para esta combinação (status atual: <span className="font-medium text-fg2">{currentLabel}</span>).
            </div>
          )}

          {/* Preview */}
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--alpha-border)' }}>
            {channel === 'email' && assunto && (
              <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--alpha-border)', background: 'var(--alpha-bg-xs)' }}>
                <span className="text-[10px] font-semibold text-fg4 uppercase tracking-wider mr-2">Assunto</span>
                <span className="text-xs font-medium text-foreground">{assunto}</span>
              </div>
            )}
            <pre className="whitespace-pre-wrap text-xs text-fg2 font-sans leading-relaxed p-3 max-h-48 overflow-y-auto">
              {corpo}
            </pre>
          </div>

          {channel === 'whatsapp' && !lead.telefone && (
            <p className="text-xs" style={{ color: 'var(--red-hi)' }}>
              ⚠ Este lead não tem telefone cadastrado. Preencha antes de enviar.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button
            variant="outline"
            onClick={() => registerInteracao(false)}
            disabled={busy}
          >
            {mode === 'send' ? 'Enviar sem avançar' : 'Copiar sem avançar'}
          </Button>
          <Button
            onClick={() => registerInteracao(true)}
            disabled={busy || (channel === 'whatsapp' && mode === 'send' && !lead.telefone)}
            style={{ backgroundColor: channelMeta.color }}
          >
            {mode === 'send'
              ? <><MessageCircle className="w-4 h-4 mr-1.5" /> {suggested ? 'Enviar + avançar' : 'Enviar'}</>
              : <><Copy className="w-4 h-4 mr-1.5" /> {suggested ? 'Copiar + avançar' : 'Copiar'}</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
