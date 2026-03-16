import { useState } from 'react'
import { X, Calendar, Clock, MapPin, Link, Users } from 'lucide-react'
import { useCreateReuniao } from '@/hooks/useReunioes'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
  prefill?: {
    titulo?: string
    dataHora?: Date
    local?: string
    link_video?: string
    slack_ts?: string
    slack_channel?: string
  }
}

export function NovaReuniaoModal({ open, onClose, prefill }: Props) {
  const create = useCreateReuniao()

  function toLocalInput(dt?: Date): string {
    if (!dt) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
  }

  const [titulo, setTitulo] = useState(prefill?.titulo ?? '')
  const [dataHora, setDataHora] = useState(toLocalInput(prefill?.dataHora))
  const [duracao, setDuracao] = useState('60')
  const [local, setLocal] = useState(prefill?.local ?? '')
  const [linkVideo, setLinkVideo] = useState(prefill?.link_video ?? '')
  const [participantes, setParticipantes] = useState('')
  const [descricao, setDescricao] = useState('')

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo || !dataHora) { toast.error('Título e data são obrigatórios'); return }
    try {
      await create.mutateAsync({
        titulo,
        data_hora: new Date(dataHora).toISOString(),
        duracao_minutos: parseInt(duracao) || 60,
        local: local || undefined,
        link_video: linkVideo || undefined,
        participantes: participantes ? participantes.split(',').map(s => s.trim()).filter(Boolean) : [],
        descricao: descricao || undefined,
        status: 'agendada',
        slack_ts: prefill?.slack_ts,
        slack_channel: prefill?.slack_channel,
      })
      toast.success('Reunião agendada!')
      onClose()
    } catch (err) {
      toast.error('Erro ao salvar reunião')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-slate-800">Nova Reunião</h2>
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
              <Users className="w-3.5 h-3.5 inline mr-1" />Participantes (separados por vírgula)
            </label>
            <input
              value={participantes}
              onChange={e => setParticipantes(e.target.value)}
              placeholder="Ana, João, Maria"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
              disabled={create.isPending}
              className="flex-1 px-4 py-2 rounded-lg text-sm text-white font-medium disabled:opacity-50"
              style={{ backgroundColor: '#0089ac' }}
            >
              {create.isPending ? 'Salvando...' : 'Agendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
