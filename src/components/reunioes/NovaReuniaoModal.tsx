import { useState, useEffect } from 'react'
import { X, Calendar, Clock, MapPin, Link, Users, ExternalLink, ChevronDown } from 'lucide-react'
import { useCreateReuniao, useUpdateReuniao, type Reuniao } from '@/hooks/useReunioes'
import { usePerfis } from '@/hooks/usePerfis'
import { toast } from 'sonner'

const TEAM_EMAILS = [
  { email: 'ana.carolina@consej.com.br', nome: 'Ana Carolina' },
  { email: 'camila.silveira@consej.com.br', nome: 'Camila Silveira' },
  { email: 'gabriel.lima@consej.com.br', nome: 'Gabriel Lima' },
  { email: 'larissa.fonte@consej.com.br', nome: 'Larissa Fonte' },
  { email: 'luna.melo@consej.com.br', nome: 'Luna Melo' },
  { email: 'maria.dantas@consej.com.br', nome: 'Maria Dantas' },
]

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
  const { data: perfis = [] } = usePerfis()
  const isEdit = !!reuniao

  const [titulo, setTitulo] = useState('')
  const [dataHora, setDataHora] = useState('')
  const [duracao, setDuracao] = useState('60')
  const [local, setLocal] = useState('')
  const [showParticipantPicker, setShowParticipantPicker] = useState(false)
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

  // Build merged member list: TEAM_EMAILS + any extra perfis
  const perfilByEmail = new Map(perfis.map(p => [p.email, p]))
  const teamMembers = TEAM_EMAILS.map(t => ({
    key: t.email,
    email: t.email,
    nome: perfilByEmail.get(t.email)?.nome ?? t.nome,
    cargo: perfilByEmail.get(t.email)?.cargo,
  }))
  perfis.forEach(p => {
    if (p.email && !TEAM_EMAILS.find(t => t.email === p.email)) {
      teamMembers.push({ key: p.id, email: p.email, nome: p.nome, cargo: p.cargo })
    }
  })

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
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10 bg-card border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <h2 className="text-lg font-semibold text-[rgba(230,235,240,0.92)]">{isEdit ? 'Editar Reunião' : 'Nova Reunião'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.04)] text-[rgba(100,120,140,0.55)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[rgba(215,225,235,0.85)] mb-1">Título *</label>
            <input
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ex: Reunião com cliente XYZ"
              className="form-control"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[rgba(215,225,235,0.85)] mb-1">
                <Calendar className="w-3.5 h-3.5 inline mr-1" />Data e Hora *
              </label>
              <input
                type="datetime-local"
                value={dataHora}
                onChange={e => setDataHora(e.target.value)}
                className="form-control"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[rgba(215,225,235,0.85)] mb-1">
                <Clock className="w-3.5 h-3.5 inline mr-1" />Duração (min)
              </label>
              <select
                value={duracao}
                onChange={e => setDuracao(e.target.value)}
                className="form-control"
              >
                {[30, 45, 60, 90, 120].map(d => (
                  <option key={d} value={d}>{d} min</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[rgba(215,225,235,0.85)] mb-1">
              <MapPin className="w-3.5 h-3.5 inline mr-1" />Local
            </label>
            <input
              value={local}
              onChange={e => setLocal(e.target.value)}
              placeholder="Sala, endereço ou online"
              className="form-control"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[rgba(215,225,235,0.85)] mb-1">
              <Link className="w-3.5 h-3.5 inline mr-1" />Link de vídeo
            </label>
            <input
              value={linkVideo}
              onChange={e => setLinkVideo(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="form-control"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[rgba(215,225,235,0.85)] mb-1">
              <Users className="w-3.5 h-3.5 inline mr-1" />Participantes
            </label>

            {/* Membros da equipe */}
            <div className="mb-2">
              <button
                type="button"
                onClick={() => setShowParticipantPicker(v => !v)}
                className="flex items-center gap-2 text-xs text-blue-600 hover:underline mb-1"
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${showParticipantPicker ? 'rotate-180' : ''}`} />
                Selecionar membros da equipe
              </button>
              {showParticipantPicker && (
                <div className="border rounded-lg divide-y divide-border mb-2 max-h-48 overflow-y-auto">
                  {teamMembers.map(m => {
                    const checked = participantes.split(',').map(s => s.trim()).includes(m.email)
                    return (
                      <label key={m.key} className="flex items-center gap-3 px-3 py-2 hover:bg-background cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const list = participantes.split(',').map(s => s.trim()).filter(Boolean)
                            if (checked) {
                              setParticipantes(list.filter(e => e !== m.email).join(', '))
                            } else {
                              setParticipantes([...list, m.email].join(', '))
                            }
                          }}
                          className="rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[rgba(215,225,235,0.85)] truncate">{m.nome}</p>
                          {m.cargo && <p className="text-xs text-[rgba(100,120,140,0.55)]">{m.cargo}</p>}
                        </div>
                        <span className="text-xs text-[rgba(100,120,140,0.55)] truncate max-w-[160px]">{m.email}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            <input
              value={participantes}
              onChange={e => setParticipantes(e.target.value)}
              placeholder="email@exemplo.com, outro@empresa.com"
              className="form-control"
            />
            <p className="text-xs text-[rgba(100,120,140,0.55)] mt-1">Os participantes receberão convite ao criar no Google Calendar</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[rgba(215,225,235,0.85)] mb-1">Descrição</label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              rows={2}
              className="form-control resize-none"
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
              className="flex-1 px-4 py-2 border rounded-lg text-sm text-[rgba(150,165,180,0.70)] hover:bg-background"
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
