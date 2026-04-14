import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Sidebar } from './Sidebar'
import { GlobalSearch } from './GlobalSearch'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { Toaster } from 'sonner'

export function AppLayout() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/login', { replace: true })
      setChecking(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) navigate('/login', { replace: true })
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  if (checking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5" style={{ backgroundColor: '#00081d' }}>
        <img src="/logo.png" alt="CONSEJ" className="h-12 w-auto opacity-90" />
        <div
          className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: 'rgba(107,208,231,0.2)', borderTopColor: 'rgba(107,208,231,0.85)' }}
        />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background">
        <div key={location.pathname} className="p-6 animate-in fade-in duration-150">
          <Outlet />
        </div>
      </main>
      <GlobalSearch />
      <OnboardingWizard />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'hsl(var(--card))',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))',
          },
        }}
      />
    </div>
  )
}
