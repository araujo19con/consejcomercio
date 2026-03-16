import { useState, useEffect } from 'react'
import { X, Calendar, Clock, MapPin, Link, Users, ExternalLink } from 'lucide-react'
import { useCreateReuniao, useUpdateReuniao, type Reuniao } from '@/hooks/useReunioes'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
  reuniao?: Reuniao // se passado, modo edição
  prefill?: {
    titulo?: string
    dataHora?: Date
    local?: string
    link_video?: string
    slack_ts?: string
    slack_channel?: string
  }
}

function toLocalInput(dt?: Date | string): string {
  if (!dt) return ''
  const d = typeof dt === 'string' ? new Date(dt) : dt
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function buildGoogleCalendarUrl(params: {
  titulo: string
  dataHora: string
  duracao: number
  local: string
  descricao: string
  participantes: string
}): string {
  if (!params.dataHora) return ''
  const start = new Date(params.dataHora)
  const end = new Date(start.getTime() + params.duracao * 60000)
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const base = 'https://calendar.google.com/calendar/r/eventedit'
  const query = new URLSearchParams({
    text: params.titulo || 'Reunião CONSEJ',
    dates: `${fmt(start)}/${fmt(end)}`,
    details: params.descricao || 'Reunião agendada pelo CONSEJ CRM',
    location: params.local || '',
    add: params.participantes,
    sf: 'true',
    output: 'xml',
  })
  return `${base}?${query}`
}

export function NovaReuniaoModal({ open, onClose, reuniao, prefill }: Props) {
  const create = useCreateReuniao()
  const update = useUpdateReuniao()
  const isEdit = !!reuniao

  const [titulo, setTitulo] = useState('')
  const [dataHora, setDataHora] = useState('')
  const [duracao, setDuracao] = useState('60')
  const [local, setLocal] = useState('')
  const [linkVideo, setLinkVideo] = useState('')
  const [participantes, setParticipantes] = useState('')
  const [descricao, setDescricao] = useState('')

  // Preenche campos ao abrir
  useEffect(() => {
    if (!open) return
    if (reuniao) {
      setTitulo(reuniao.titulo)
      setDataHora(toLocalInput(reuniao.data_hora))
      setDuracao(String(reuniao.duracao_minutos))
      setLocal(reuniao.local ?? '')
      setLinkVideo(reuniao.link_video ?? '')
      setParticipantes((reuniao.participantes ?? []).join(', '))
      setDescricao(reuniao.descricao ?? '')
    } else {
      setTitulo(prefill?.titulo ?? '')
      setDataHora(toLocalInput(prefill?.dataHora))
      setDuracao('60')
      setLocal(prefill?.local ?? '')
      setLinkVideo(prefill?.link_video ?? '')
      setParticipantes('')
      setDescricao('')
    }
  }, [open, reuniao, prefill])

  if (!open) return null

  const calendarUrl = buildGoogleCalendarUrl({
    titulo,
    dataHora,
    duracao: parseInt(duracao) || 60,
    local,
    descricao,
    participantes,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo || !dataHora) { toast.error('Título e data são obrigatórios'); return }
    const payload = {
      titulo,
      data_hora: new Date(dataHora).toISOString(),
      duracao_minutos: parseInt(duracao) || 60,
      local: local || undefined,
      link_video: linkVideo || undefined,
      participantes: participantes ? participantes.split(',').map(s => s.trim()).filter(Boolean) : [],
      descricao: descricao || undefined,
      status: (reuniao?.status ?? 'agendada') as Reuniao['status'],
      slack_ts: prefill?.slack_ts ?? reuniao?.slack_ts,
      slack_channel: prefill?.slack_channel ?? reuniao?.slack_channel,
    }
    try {
      if (isEdit) {
        await update.mutateAsync({ id: reuniao.id, ...payload })
        toast.success('Reunião atualizada!')
      } else {
        await create.mutateAsync(payload)
        toast.success('Reunião agendada!')
      }
      onClose()
    } catch {
      toast.error('Erro ao salvar reunião')
    }
  }

  const isPending = create.isPending || update.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-slate-800">{isEdit ? 'Editar Reunião' : 'Nova Reunião'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Título *</label>
            <input
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ex: Reunião com cliente XYZ"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <Calendar className="w-3.5 h-3.5 inline mr-1" />Data e Hora *
              </label>
              <input
                type="datetime-local"
                value={dataHora}
                onChange={e => setDataHora(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <Clock className="w-3.5 h-3.5 inline mr-1" />Duração (min)
              </label>
              <select
                value={duracao}
                onChange={e => setDuracao(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[30, 45, 60, 90, 120].map(d => (
                  <option key={d} value={d}>{d} min</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <MapPin className="w-3.5 h-3.5 inline mr-1" />Local
            </label>
            <input
              value={local}
              onChange={e => setLocal(e.target.value)}
              placeholder="Sala, endereço ou online"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <Link className="w-3.5 h-3.5 inline mr-1" />Link de vídeo
            </label>
            <input
              value={linkVideo}
              onChange={e => setLinkVideo(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <Users className="w-3.5 h-3.5 inline mr-1" />E-mails dos participantes (separados por vírgula)
            </label>
            <input
              value={participantes}
              onChange={e => setParticipantes(e.target.value)}
              placeholder="ana@consej.com, cliente@empresa.com"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1">Os participantes receberão convite ao criar no Google Calendar</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Google Calendar button */}
          {dataHora && (
            <a
              href={calendarUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg border-2 border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-50 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Criar evento no Google Calendar (com Google Meet)
            </a>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2 rounded-lg text-sm text-white font-medium disabled:opacity-50"
              style={{ backgroundColor: '#0089ac' }}
            >
              {isPending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Agendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
