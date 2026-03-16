import { NavLink, useNavigate } from 'react-router-dom'
import { Scale, LayoutDashboard, KanbanSquare, Stethoscope, Briefcase, FileText, Inbox, Share2, Handshake, TrendingUp, ClipboardList, Settings, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
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
  { to: '/auditoria', label: 'Auditoria', icon: ClipboardList },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
    toast.success('Sessão encerrada.')
  }

  return (
    <div className="w-56 shrink-0 h-screen bg-slate-900 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-slate-700">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <Scale className="w-4.5 h-4.5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-none">CONSEJ</p>
          <p className="text-xs text-slate-400 mt-0.5">Assessoria Jurídica</p>
        </div>
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
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-slate-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </div>
  )
}
