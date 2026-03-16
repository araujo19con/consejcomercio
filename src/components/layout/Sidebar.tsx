import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, KanbanSquare, Stethoscope, Briefcase, FileText, Inbox, Share2, Handshake, TrendingUp, ClipboardList, Settings, LogOut, MessageSquare, CalendarDays } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useMeuPerfil } from '@/hooks/usePerfis'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/leads', label: 'Leads', icon: KanbanSquare },
  { to: '/diagnosticos', label: 'Diagnósticos', icon: Stethoscope },
  { to: '/clientes', label: 'Clientes', icon: Briefcase },
  { to: '/contratos', label: 'Contratos', icon: FileText },
  { to: '/demandas', label: 'Demandas', icon: Inbox },
  { to: '/indicacoes', label: 'Indicações', icon: Share2 },
  { to: '/parceiros', label: 'Parceiros', icon: Handshake },
  { to: '/oportunidades', label: 'Oportunidades', icon: TrendingUp },
  { to: '/reunioes', label: 'Reuniões', icon: CalendarDays },
  { to: '/slack', label: 'Slack', icon: MessageSquare },
  { to: '/auditoria', label: 'Auditoria', icon: ClipboardList },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
  const navigate = useNavigate()
  const { data: perfil } = useMeuPerfil()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
    toast.success('Sessão encerrada.')
  }

  const initials = perfil?.nome
    ? perfil.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <div className="w-56 shrink-0 h-screen flex flex-col" style={{ backgroundColor: '#00081d' }}>
      {/* Logo */}
      <div className="flex items-center justify-center px-4 py-5" style={{ borderBottom: '1px solid #000d32' }}>
        <img src="/logo.png" alt="CONSEJ" className="h-10 w-auto" />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors',
                isActive ? 'text-white' : 'hover:text-white'
              )
            }
            style={({ isActive }) => isActive
              ? { backgroundColor: '#0089ac', color: '#fff' }
              : { color: '#6bd0e7' }
            }
            onMouseEnter={e => {
              const el = e.currentTarget
              if (!el.getAttribute('aria-current')) el.style.backgroundColor = '#00263a'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget
              if (!el.getAttribute('aria-current')) el.style.backgroundColor = ''
            }}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Profile + Logout */}
      <div className="p-2 space-y-1" style={{ borderTop: '1px solid #000d32' }}>
        {/* Profile link */}
        <NavLink
          to="/perfil"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm w-full transition-colors"
          style={({ isActive }) => isActive
            ? { backgroundColor: '#0089ac', color: '#fff' }
            : { color: '#6bd0e7' }
          }
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#00263a' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '' }}
        >
          {perfil?.foto_url ? (
            <img src={perfil.foto_url} alt={perfil.nome} className="w-5 h-5 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-cyan-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
              {initials}
            </div>
          )}
          <span className="truncate">{perfil?.nome || 'Meu perfil'}</span>
        </NavLink>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm w-full transition-colors"
          style={{ color: '#6bd0e7' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#00263a'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; (e.currentTarget as HTMLElement).style.color = '#6bd0e7' }}
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </div>
  )
}
