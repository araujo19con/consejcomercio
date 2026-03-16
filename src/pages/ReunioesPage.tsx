import { useState } from 'react'
import { Plus, ChevronLeft, ChevronRight, Video, MapPin, Clock, CheckCircle, XCircle, Calendar } from 'lucide-react'
import { useReunioes, useUpdateReuniao, useDeleteReuniao, type Reuniao } from '@/hooks/useReunioes'
import { NovaReuniaoModal } from '@/components/reunioes/NovaReuniaoModal'
import { toast } from 'sonner'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DIAS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function getWeekDays(reference: Date): Date[] {
  const day = reference.getDay()
  const monday = new Date(reference)
  monday.setDate(reference.getDate() - (day === 0 ? 6 : day - 1))
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function isSameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
}

function StatusBadge({ status }: { status: Reuniao['status'] }) {
  const map = {
    agendada: 'bg-blue-100 text-blue-700',
    realizada: 'bg-green-100 text-green-700',
    cancelada: 'bg-red-100 text-red-600',
  }
  const label = { agendada: 'Agendada', realizada: 'Realizada', cancelada: 'Cancelada' }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status]}`}>{label[status]}</span>
}

function ReuniaoCard({ reuniao, onStatusChange, onDelete }: {
  reuniao: Reuniao
  onStatusChange: (id: string, status: Reuniao['status']) => void
  onDelete: (id: string) => void
}) {
  const dt = new Date(reuniao.data_hora)
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm hover:shadow transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-slate-800 leading-tight">{reuniao.titulo}</p>
        <StatusBadge status={reuniao.status} />
      </div>
      <div className="space-y-1 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {reuniao.duracao_minutos}min
        </div>
        {reuniao.local && <div className="flex items-center gap-1"><MapPin className="w-3 h-3" />{reuniao.local}</div>}
        {reuniao.link_video && (
          <a href={reuniao.link_video} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline">
            <Video className="w-3 h-3" />Entrar na chamada
          </a>
        )}
        {reuniao.participantes?.length > 0 && (
          <div className="text-slate-400">{reuniao.participantes.join(', ')}</div>
        )}
      </div>
      {reuniao.status === 'agendada' && (
        <div className="flex gap-1.5 mt-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => onStatusChange(reuniao.id, 'realizada')}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-green-600 hover:bg-green-50"
          >
            <CheckCircle className="w-3 h-3" />Realizada
          </button>
          <button
            onClick={() => onStatusChange(reuniao.id, 'cancelada')}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-red-500 hover:bg-red-50"
          >
            <XCircle className="w-3 h-3" />Cancelar
          </button>
        </div>
      )}
    </div>
  )
}

export function ReunioesPage() {
  const [weekRef, setWeekRef] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const { data: reunioes = [], isLoading } = useReunioes()
  const update = useUpdateReuniao()
  const deletar = useDeleteReuniao()

  const weekDays = getWeekDays(weekRef)
  const today = new Date()

  function prevWeek() { const d = new Date(weekRef); d.setDate(d.getDate() - 7); setWeekRef(d) }
  function nextWeek() { const d = new Date(weekRef); d.setDate(d.getDate() + 7); setWeekRef(d) }
  function goToday() { setWeekRef(new Date()) }

  async function handleStatus(id: string, status: Reuniao['status']) {
    try { await update.mutateAsync({ id, status }); toast.success('Status atualizado') }
    catch { toast.error('Erro ao atualizar') }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir reunião?')) return
    try { await deletar.mutateAsync(id); toast.success('Reunião removida') }
    catch { toast.error('Erro ao excluir') }
  }

  const weekRange = `${weekDays[0].getDate()} - ${weekDays[6].getDate()} de ${MESES[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reuniões</h1>
          <p className="text-slate-500 text-sm mt-0.5">Calendário semanal</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ backgroundColor: '#0089ac' }}
        >
          <Plus className="w-4 h-4" />Nova Reunião
        </button>
      </div>

      {/* Week nav */}
      <div className="flex items-center gap-3">
        <button onClick={prevWeek} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50">
          <ChevronLeft className="w-4 h-4 text-slate-500" />
        </button>
        <button onClick={goToday} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm hover:bg-slate-50 text-slate-600">
          Hoje
        </button>
        <button onClick={nextWeek} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50">
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
        <span className="text-sm font-medium text-slate-700">{weekRange}</span>
      </div>

      {/* Week grid */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Carregando...</div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const dayReunioes = reunioes.filter(r => isSameDay(new Date(r.data_hora), day))
            const isToday = isSameDay(day, today)
            const isPast = day < today && !isToday

            return (
              <div key={day.toISOString()} className="min-h-32">
                {/* Day header */}
                <div className={`text-center mb-2 py-2 rounded-lg ${isToday ? 'text-white' : 'text-slate-600'}`}
                  style={isToday ? { backgroundColor: '#0089ac' } : {}}>
                  <div className="text-xs font-medium">{DIAS[day.getDay()]}</div>
                  <div className={`text-lg font-bold ${isPast && !isToday ? 'text-slate-400' : ''}`}>
                    {day.getDate()}
                  </div>
                </div>

                {/* Meetings */}
                <div className="space-y-1.5">
                  {dayReunioes.map(r => (
                    <ReuniaoCard
                      key={r.id}
                      reuniao={r}
                      onStatusChange={handleStatus}
                      onDelete={handleDelete}
                    />
                  ))}
                  {dayReunioes.length === 0 && (
                    <div className="text-center py-3 text-slate-200 text-xs">–</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Upcoming list */}
      <div className="mt-6">
        <h2 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" />Próximas Reuniões
        </h2>
        <div className="space-y-2">
          {reunioes
            .filter(r => new Date(r.data_hora) >= today && r.status === 'agendada')
            .slice(0, 10)
            .map(r => {
              const dt = new Date(r.data_hora)
              return (
                <div key={r.id} className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl px-4 py-3">
                  <div className="text-center w-10 shrink-0">
                    <div className="text-xs text-slate-400">{DIAS[dt.getDay()]}</div>
                    <div className="text-lg font-bold text-slate-800">{dt.getDate()}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm">{r.titulo}</p>
                    <p className="text-xs text-slate-400">
                      {dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {r.duracao_minutos}min
                      {r.local ? ` · ${r.local}` : ''}
                    </p>
                  </div>
                  {r.link_video && (
                    <a href={r.link_video} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white font-medium"
                      style={{ backgroundColor: '#0089ac' }}>
                      <Video className="w-3 h-3" />Entrar
                    </a>
                  )}
                </div>
              )
            })}
          {reunioes.filter(r => new Date(r.data_hora) >= today && r.status === 'agendada').length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">Nenhuma reunião agendada.</div>
          )}
        </div>
      </div>

      <NovaReuniaoModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  )
}
