import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Toaster } from 'sonner'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      toast.error('Email ou senha inválidos.')
    } else {
      navigate('/dashboard', { replace: true })
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: '#00081d',
        backgroundImage:
          'linear-gradient(rgba(0,137,172,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(0,137,172,0.10) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Toaster richColors />

      {/* Radial vignette over grid */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 20%, #00081d 80%)',
        zIndex: 1,
        pointerEvents: 'none',
      }} />

      {/* Teal glow behind card */}
      <div style={{
        position: 'absolute',
        width: 480, height: 480,
        background: 'radial-gradient(circle, rgba(0,137,172,0.14) 0%, transparent 70%)',
        borderRadius: '50%',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 2,
        pointerEvents: 'none',
      }} />

      {/* Card */}
      <div
        className="w-full"
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: 380,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(107,208,231,0.18)',
          borderRadius: 16,
          padding: '40px 36px 36px',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 0 0 1px rgba(0,137,172,0.08), 0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo area */}
        <div className="flex flex-col items-center mb-7" style={{ gap: 4 }}>
          <img
            src="/logo.png"
            alt="CONSEJ"
            style={{ height: 52, width: 'auto', objectFit: 'contain', marginBottom: 6, filter: 'brightness(1.05)' }}
          />
          <span style={{
            fontSize: 11, fontWeight: 500, color: '#6bd0e7',
            letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.8,
          }}>
            Consultoria Jurídica Júnior
          </span>
        </div>

        <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: 4 }}>Entrar</p>
        <p style={{ fontSize: 12, color: 'rgba(107,208,231,0.65)', marginBottom: 24 }}>Acesso restrito à equipe CONSEJ</p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <Label
              htmlFor="email"
              style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}
            >
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                marginTop: 6,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: 'rgba(255,255,255,0.85)',
              }}
              className="focus:border-[rgba(0,137,172,0.6)] focus:bg-[rgba(0,137,172,0.06)] placeholder:text-[rgba(255,255,255,0.25)]"
            />
          </div>
          <div>
            <Label
              htmlFor="password"
              style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}
            >
              Senha
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                marginTop: 6,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: 'rgba(255,255,255,0.85)',
              }}
              className="focus:border-[rgba(0,137,172,0.6)] focus:bg-[rgba(0,137,172,0.06)] placeholder:text-[rgba(255,255,255,0.25)]"
            />
          </div>
          <Button
            type="submit"
            className="w-full text-white mt-1"
            style={{
              background: 'linear-gradient(135deg, #0089ac, #006d88)',
              boxShadow: '0 4px 16px rgba(0,137,172,0.35)',
              border: 'none',
              height: 42,
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '0.02em',
            }}
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar →'}
          </Button>
        </form>

        <p className="text-center mt-5" style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', lineHeight: 1.6 }}>
          Acesso apenas para membros da equipe.<br />
          Contate o administrador para criar sua conta.
        </p>
      </div>

      {/* Version badge */}
      <span style={{
        position: 'absolute', bottom: 24, right: 24,
        fontSize: 10, color: 'rgba(107,208,231,0.3)',
        letterSpacing: '0.08em', zIndex: 10,
      }}>
        CONSEJ CRM v2
      </span>
    </div>
  )
}
