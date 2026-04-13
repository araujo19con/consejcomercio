import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Toaster } from 'sonner'
import { CheckCircle2, Eye, EyeOff } from 'lucide-react'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  // Supabase fires PASSWORD_RECOVERY when the recovery link is opened
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    // Also check if there's already an active session from the link
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('As senhas não coincidem.')
      return
    }
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      toast.error('Erro ao redefinir senha. Tente novamente.')
    } else {
      setDone(true)
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

      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 20%, #00081d 80%)', zIndex: 1, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 480, height: 480, background: 'radial-gradient(circle, rgba(0,137,172,0.14) 0%, transparent 70%)', borderRadius: '50%', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 2, pointerEvents: 'none' }} />

      <div
        className="w-full"
        style={{ position: 'relative', zIndex: 10, maxWidth: 380, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(107,208,231,0.18)', borderRadius: 16, padding: '40px 36px 36px', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 0 0 1px rgba(0,137,172,0.08), 0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)' }}
      >
        <div className="flex flex-col items-center mb-7" style={{ gap: 4 }}>
          <img src="/logo.png" alt="CONSEJ" style={{ height: 52, width: 'auto', objectFit: 'contain', marginBottom: 6, filter: 'brightness(1.05)' }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: '#6bd0e7', letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.8 }}>
            Consultoria Jurídica Júnior
          </span>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle2 style={{ width: 22, height: 22, color: '#34d399' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: 8 }}>Senha redefinida!</p>
            <p style={{ fontSize: 12, color: 'rgba(107,208,231,0.65)', marginBottom: 24, lineHeight: 1.7 }}>
              Sua senha foi atualizada com sucesso.
            </p>
            <Button
              className="w-full text-white"
              style={{ background: 'linear-gradient(135deg, #0089ac, #006d88)', boxShadow: '0 4px 16px rgba(0,137,172,0.35)', border: 'none', height: 42, fontSize: 14, fontWeight: 600 }}
              onClick={() => navigate('/login', { replace: true })}
            >
              Ir para o login →
            </Button>
          </div>
        ) : !ready ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <p style={{ fontSize: 13, color: 'rgba(107,208,231,0.65)' }}>Verificando link de recuperação...</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: 4 }}>Nova senha</p>
            <p style={{ fontSize: 12, color: 'rgba(107,208,231,0.65)', marginBottom: 24 }}>Escolha uma nova senha para sua conta</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <Label htmlFor="new-password" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Nova senha
                </Label>
                <div style={{ position: 'relative', marginTop: 6 }}>
                  <Input
                    id="new-password"
                    type={showPw ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.85)', paddingRight: 38 }}
                    className="focus:border-[rgba(0,137,172,0.6)] focus:bg-[rgba(0,137,172,0.06)] placeholder:text-[rgba(255,255,255,0.25)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 0 }}
                  >
                    {showPw ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirm-password" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Confirmar senha
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Repita a nova senha"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  style={{ marginTop: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.85)' }}
                  className="focus:border-[rgba(0,137,172,0.6)] focus:bg-[rgba(0,137,172,0.06)] placeholder:text-[rgba(255,255,255,0.25)]"
                />
              </div>

              <Button
                type="submit"
                className="w-full text-white mt-1"
                style={{ background: 'linear-gradient(135deg, #0089ac, #006d88)', boxShadow: '0 4px 16px rgba(0,137,172,0.35)', border: 'none', height: 42, fontSize: 14, fontWeight: 600, letterSpacing: '0.02em' }}
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Redefinir senha →'}
              </Button>
            </form>
          </>
        )}
      </div>

      <span style={{ position: 'absolute', bottom: 24, right: 24, fontSize: 10, color: 'rgba(107,208,231,0.3)', letterSpacing: '0.08em', zIndex: 10 }}>
        CONSEJ CRM v2
      </span>
    </div>
  )
}
