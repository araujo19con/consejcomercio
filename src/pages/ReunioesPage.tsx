import { useState } from 'react'
import { Plus, ChevronLeft, ChevronRight, Video, MapPin, Clock, CheckCircle, XCircle, Calendar, Pencil, Trash2 } from 'lucide-react'
import { useReunioes, useUpdateReuniao, useDeleteReuniao, type Reuniao } from '@/hooks/useReunioes'
import { usePerfis, type Perfil } from '@/hooks/usePerfis'
import { NovaReuniaoModal } from '@/components/reunioes/NovaReuniaoModal'
import { toast } from 'sonner'

const TEAM_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-teal-500', 'bg-orange-500',
  'bg-pink-500', 'bg-cyan-600', 'bg-green-500', 'bg-red-500',
]

function ParticipanteAvatar({ email, perfilByEmail, index }: {
  email: string
  perfilByEmail: Map<string, Perfil>
  index: number
}) {
  const perfil = perfilByEmail.get(email)
  const nome = perfil?.nome ?? email
  const initials = nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  const color = TEAM_COLORS[index % TEAM_COLORS.length]

  return (
    <div
      title={`${nome} <${email}>`}
      className={`w-6 h-6 rounded-full border-2 border-[rgba(10,22,40,0.85)] flex items-center justify-center text-white text-[9px] font-bold shrink-0 cursor-default ${perfil?.foto_url ? '' : color}`}
      style={perfil?.foto_url ? { backgroundImage: `url(${perfil.foto_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
    >
      {!perfil?.foto_url && initials}
    </div>
  )
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
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
    agendada: 'bg-[rgba(0,137,172,0.15)] text-[#6bd0e7]',
    realizada: 'bg-[rgba(16,185,129,0.15)] text-[#34d399]',
    cancelada: 'bg-[rgba(239,68,68,0.15)] text-[#f87171]',
  }
  const label = { agendada: 'Agendada', realizada: 'Realizada', cancelada: 'Cancelada' }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status]}`}>{label[status]}</span>
}

function ReuniaoCard({ reuniao, onStatusChange, onDelete, onEdit, perfilByEmail }: {
  reuniao: Reuniao
  onStatusChange: (id: string, status: Reuniao['status']) => void
  onDelete: (id: string) => void
  onEdit: (r: Reuniao) => void
  perfilByEmail: Map<string, Perfil>
}) {
  const dt = new Date(reuniao.data_hora)
  return (
    <div className="bg-card rounded-xl border p-3 shadow-sm hover:shadow transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-foreground leading-tight">{reuniao.titulo}</p>
        <StatusBadge status={reuniao.status} />
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
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
          <div className="flex items-center flex-wrap gap-0.5 mt-1">
            {reuniao.participantes.map((email, i) => (
              <ParticipanteAvatar key={email} email={email} perfilByEmail={perfilByEmail} index={i} />
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-1.5 mt-2 pt-2 flex-wrap" style={{ borderTop: '1px solid var(--alpha-bg-sm)' }}>
        <button onClick={() => onEdit(reuniao)} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:bg-[var(--alpha-bg-xs)]">
          <Pencil className="w-3 h-3" />Editar
        </button>
        {reuniao.status === 'agendada' && (<>
          <button onClick={() => onStatusChange(reuniao.id, 'realizada')} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs hover:bg-[rgba(16,185,129,0.10)]" style={{ color: '#34d399' }}>
            <CheckCircle className="w-3 h-3" />Realizada
          </button>
          <button onClick={() => onStatusChange(reuniao.id, 'cancelada')} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs hover:bg-[rgba(239,68,68,0.10)]" style={{ color: '#f87171' }}>
            <XCircle className="w-3 h-3" />Cancelar
          </button>
        </>)}
        <button onClick={() => onDelete(reuniao.id)} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs ml-auto hover:bg-[rgba(239,68,68,0.10)]" style={{ color: '#f87171' }}>
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

export function ReunioesPage() {
  const [weekRef, setWeekRef] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<Reuniao | undefined>()
  const { data: reunioes = [], isLoading } = useReunioes()
  const { data: perfis = [] } = usePerfis()
  const update = useUpdateReuniao()
  const deletar = useDeleteReuniao()

  const perfilByEmail = new Map(perfis.filter(p => p.email).map(p => [p.email!, p]))

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
          <h1 className="text-2xl font-bold text-foreground">Reuniões</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Calendário semanal</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ backgroundColor: 'rgba(0,137,172,0.25)' }}
        >
          <Plus className="w-4 h-4" />Nova Reunião
        </button>
      </div>

      {/* Week nav */}
      <div className="flex items-center gap-3">
        <button onClick={prevWeek} className="p-1.5 rounded-lg border hover:bg-background">
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <button onClick={goToday} className="px-3 py-1.5 rounded-lg border text-sm hover:bg-background text-muted-foreground">
          Hoje
        </button>
        <button onClick={nextWeek} className="p-1.5 rounded-lg border hover:bg-background">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
        <span className="text-sm font-medium text-fg2">{weekRange}</span>
      </div>

      {/* Week grid */}
      {isLoading ? (
        <div className="text-center py-16 text-fg4">Carregando...</div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const dayReunioes = reunioes.filter(r => isSameDay(new Date(r.data_hora), day))
            const isToday = isSameDay(day, today)
            const isPast = day < today && !isToday

            return (
              <div key={day.toISOString()} className="min-h-32">
                {/* Day header */}
                <div className={`text-center mb-2 py-2 rounded-lg ${isToday ? 'text-white' : 'text-muted-foreground'}`}
                  style={isToday ? { backgroundColor: 'rgba(0,137,172,0.25)' } : {}}>
                  <div className="text-xs font-medium">{DIAS[day.getDay()]}</div>
                  <div className={`text-lg font-bold ${isPast && !isToday ? 'text-fg4' : ''}`}>
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
                      onEdit={r => { setEditando(r); setShowModal(true) }}
                      perfilByEmail={perfilByEmail}
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
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" />Próximas Reuniões
        </h2>
        <div className="space-y-2">
          {reunioes
            .filter(r => new Date(r.data_hora) >= today && r.status === 'agendada')
            .slice(0, 10)
            .map(r => {
              const dt = new Date(r.data_hora)
              return (
                <div key={r.id} className="flex items-center gap-4 bg-card rounded-xl px-4 py-3" style={{ border: '1px solid var(--alpha-border)' }}>
                  <div className="text-center w-10 shrink-0">
                    <div className="text-xs text-fg4">{DIAS[dt.getDay()]}</div>
                    <div className="text-lg font-bold text-foreground">{dt.getDate()}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm">{r.titulo}</p>
                    <p className="text-xs text-fg4">
                      {dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {r.duracao_minutos}min
                      {r.local ? ` · ${r.local}` : ''}
                    </p>
                    {r.participantes?.length > 0 && (
                      <div className="flex items-center gap-0.5 mt-1">
                        {r.participantes.map((email, i) => (
                          <ParticipanteAvatar key={email} email={email} perfilByEmail={perfilByEmail} index={i} />
                        ))}
                      </div>
                    )}
                  </div>
                  {r.link_video && (
                    <a href={r.link_video} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white font-medium"
                      style={{ backgroundColor: 'rgba(0,137,172,0.25)' }}>
                      <Video className="w-3 h-3" />Entrar
                    </a>
                  )}
                </div>
              )
            })}
          {reunioes.filter(r => new Date(r.data_hora) >= today && r.status === 'agendada').length === 0 && (
            <div className="text-center py-8 text-fg4 text-sm">Nenhuma reunião agendada.</div>
          )}
        </div>
      </div>

      <NovaReuniaoModal
        open={showModal}
        reuniao={editando}
        onClose={() => { setShowModal(false); setEditando(undefined) }}
      />
    </div>
  )
}
