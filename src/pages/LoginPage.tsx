import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Toaster } from 'sonner'
import { ArrowLeft } from 'lucide-react'

type Mode = 'login' | 'forgot' | 'sent'

export function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
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

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) {
      toast.error('Erro ao enviar e-mail. Verifique o endereço.')
    } else {
      setMode('sent')
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
          background: 'var(--alpha-bg-xs)',
          border: '1px solid rgba(107,208,231,0.18)',
          borderRadius: 16,
          padding: '40px 36px 36px',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 0 0 1px rgba(0,137,172,0.08), 0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 var(--alpha-bg-sm)',
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

        {mode === 'login' && (
          <>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-strong-a)', marginBottom: 4 }}>Entrar</p>
            <p style={{ fontSize: 12, color: 'var(--cyan-mid)', marginBottom: 24 }}>Acesso restrito à equipe CONSEJ</p>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <Label htmlFor="email" style={{ color: 'var(--text-dim-a)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Email
                </Label>
                <Input
                  id="email" type="email" placeholder="seu@email.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required
                  style={{ marginTop: 6, background: 'var(--alpha-bg-sm)', border: '1px solid var(--alpha-border-md)', color: 'var(--text-strong-a)' }}
                  className="focus:border-[rgba(0,137,172,0.6)] focus:bg-[rgba(0,137,172,0.06)] placeholder:text-[var(--text-dim-a)]"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label htmlFor="password" style={{ color: 'var(--text-dim-a)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Senha
                  </Label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    style={{ fontSize: 11, color: 'var(--cyan-lo)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(107,208,231,0.9)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--cyan-lo)')}
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <Input
                  id="password" type="password" placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)} required
                  style={{ background: 'var(--alpha-bg-sm)', border: '1px solid var(--alpha-border-md)', color: 'var(--text-strong-a)' }}
                  className="focus:border-[rgba(0,137,172,0.6)] focus:bg-[rgba(0,137,172,0.06)] placeholder:text-[var(--text-dim-a)]"
                />
              </div>
              <Button
                type="submit"
                className="w-full text-white mt-1"
                style={{ background: 'linear-gradient(135deg, #0089ac, #006d88)', boxShadow: '0 4px 16px rgba(0,137,172,0.35)', border: 'none', height: 42, fontSize: 14, fontWeight: 600, letterSpacing: '0.02em' }}
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Entrar →'}
              </Button>
            </form>

            <p className="text-center mt-5" style={{ fontSize: 11, color: 'var(--text-dim-a)', lineHeight: 1.6 }}>
              Acesso apenas para membros da equipe.<br />
              Contate o administrador para criar sua conta.
            </p>
          </>
        )}

        {mode === 'forgot' && (
          <>
            <button
              type="button"
              onClick={() => setMode('login')}
              style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--cyan-lo)', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 20 }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(107,208,231,0.9)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--cyan-lo)')}
            >
              <ArrowLeft style={{ width: 13, height: 13 }} /> Voltar ao login
            </button>

            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-strong-a)', marginBottom: 4 }}>Recuperar senha</p>
            <p style={{ fontSize: 12, color: 'var(--cyan-mid)', marginBottom: 24 }}>Enviaremos um link de redefinição para seu e-mail</p>

            <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <Label htmlFor="email-forgot" style={{ color: 'var(--text-dim-a)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Email
                </Label>
                <Input
                  id="email-forgot" type="email" placeholder="seu@email.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required
                  style={{ marginTop: 6, background: 'var(--alpha-bg-sm)', border: '1px solid var(--alpha-border-md)', color: 'var(--text-strong-a)' }}
                  className="focus:border-[rgba(0,137,172,0.6)] focus:bg-[rgba(0,137,172,0.06)] placeholder:text-[var(--text-dim-a)]"
                />
              </div>
              <Button
                type="submit"
                className="w-full text-white mt-1"
                style={{ background: 'linear-gradient(135deg, #0089ac, #006d88)', boxShadow: '0 4px 16px rgba(0,137,172,0.35)', border: 'none', height: 42, fontSize: 14, fontWeight: 600, letterSpacing: '0.02em' }}
                disabled={loading}
              >
                {loading ? 'Enviando...' : 'Enviar link de recuperação →'}
              </Button>
            </form>
          </>
        )}

        {mode === 'sent' && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(0,137,172,0.15)', border: '1px solid rgba(0,137,172,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <span style={{ fontSize: 22 }}>✉</span>
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-strong-a)', marginBottom: 8 }}>E-mail enviado!</p>
            <p style={{ fontSize: 12, color: 'var(--cyan-mid)', lineHeight: 1.7, marginBottom: 24 }}>
              Verifique sua caixa de entrada em<br />
              <span style={{ color: 'rgba(107,208,231,0.9)', fontWeight: 500 }}>{email}</span><br />
              e clique no link para redefinir sua senha.
            </p>
            <button
              type="button"
              onClick={() => { setMode('login'); setEmail('') }}
              style={{ fontSize: 12, color: 'var(--cyan-lo)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(107,208,231,0.9)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--cyan-lo)')}
            >
              Voltar ao login
            </button>
          </div>
        )}
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
