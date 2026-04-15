import { useState, useEffect, useRef } from 'react'
import { Camera, Save, Award, Calendar, Users, FileText, Trophy, Star, Target, Stethoscope } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useMeuPerfil, useSalvarPerfil, useUploadAvatar } from '@/hooks/usePerfis'
import { useLeads } from '@/hooks/useLeads'
import { useReunioes } from '@/hooks/useReunioes'
import { useContratos } from '@/hooks/useContratos'
import { useMeusPontos, useTeamProgress } from '@/hooks/useGamification'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

function StatCard({ icon: Icon, label, value, iconBg, iconColor }: {
  icon: React.ElementType
  label: string
  value: number
  iconBg: string
  iconColor: string
}) {
  return (
    <div className="bg-card rounded-xl p-5 flex items-center gap-4 border">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: iconBg, color: iconColor }}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

// ── Mini progress bar ──────────────────────────────────────────────────────────
function MiniGoalBar({ label, value, meta, icon: Icon }: { label: string; value: number; meta: number; icon: React.ElementType }) {
  const pct = meta > 0 ? Math.min(100, (value / meta) * 100) : 0
  const color = pct >= 100 ? '#10b981' : pct >= 60 ? '#0089ac' : pct >= 30 ? '#f59e0b' : '#ef4444'
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 text-xs text-fg2">
          <Icon className="w-3.5 h-3.5" style={{ color }} />
          {label}
        </div>
        <span className="text-xs font-medium" style={{ color }}>
          {value} / {meta}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export function PerfilPage() {
  const { data: perfil, isLoading } = useMeuPerfil()
  const salvar = useSalvarPerfil()
  const uploadAvatar = useUploadAvatar()
  const fileRef = useRef<HTMLInputElement>(null)

  const [userId, setUserId] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [nome, setNome] = useState('')
  const [cargo, setCargo] = useState('')
  const [bio, setBio] = useState('')
  const [fotoUrl, setFotoUrl] = useState('')

  // Stats
  const { data: leads = [] } = useLeads()
  const { data: reunioes = [] } = useReunioes()
  const { data: contratos = [] } = useContratos()
  const meusPontos = useMeusPontos()
  const teamProgress = useTeamProgress()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
        setUserEmail(user.email ?? '')
      }
    })
  }, [])

  useEffect(() => {
    if (perfil) {
      setNome(perfil.nome ?? '')
      setCargo(perfil.cargo ?? '')
      setBio(perfil.bio ?? '')
      setFotoUrl(perfil.foto_url ?? '')
    }
  }, [perfil])

  // Stats filtradas por responsável
  const meusLeads = leads.filter(l => l.responsavel_id === userId).length
  const minhasReunioes = reunioes.filter(r => r.responsavel_id === userId && r.status === 'realizada').length
  const meusContratos = contratos.filter(c => c.responsavel_id === userId).length

  async function handleSave() {
    if (!userId) return
    if (!nome.trim()) { toast.error('Nome é obrigatório'); return }
    try {
      await salvar.mutateAsync({ id: userId, nome, cargo, bio, foto_url: fotoUrl, email: userEmail })
      toast.success('Perfil salvo!')
    } catch {
      toast.error('Erro ao salvar perfil')
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Foto muito grande. Limite: 5 MB.')
      return
    }
    try {
      const url = await uploadAvatar.mutateAsync({ userId, file })
      setFotoUrl(url)
      await salvar.mutateAsync({ id: userId, nome, cargo, bio, foto_url: url, email: userEmail })
      toast.success('Foto atualizada!')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Bucket not found') || msg.includes('bucket')) {
        toast.error('Bucket de storage não encontrado. Execute a migration 009 no Supabase.')
      } else {
        toast.error('Erro ao enviar foto. Tente novamente.')
      }
    }
  }

  if (isLoading) return <div className="text-center py-16 text-fg4">Carregando...</div>

  const initials = nome ? nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Gerencie suas informações pessoais</p>
      </div>

      {/* Avatar + info */}
      <div className="bg-card rounded-2xl border p-6">
        <div className="flex items-center gap-6 mb-6">
          {/* Avatar */}
          <div className="relative">
            <div
              className="w-24 h-24 rounded-2xl overflow-hidden flex items-center justify-center text-white text-2xl font-bold cursor-pointer select-none"
              style={{ backgroundColor: '#0089ac' }}
              onClick={() => !uploadAvatar.isPending && fileRef.current?.click()}
            >
              {uploadAvatar.isPending ? (
                <div className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : fotoUrl ? (
                <img src={fotoUrl} alt={nome} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <button
              onClick={() => !uploadAvatar.isPending && fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-2 bg-card border-background hover:bg-muted transition-colors"
              title="Alterar foto"
            >
              <Camera className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          <div>
            <p className="text-xl font-semibold text-foreground">{nome || 'Sem nome'}</p>
            <p className="text-muted-foreground text-sm">{cargo || 'Sem cargo'}</p>
            <p className="text-fg4 text-xs mt-0.5">{userEmail}</p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-fg2 mb-1">Nome *</label>
              <input
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Seu nome completo"
                className="form-control"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg2 mb-1">Cargo</label>
              <input
                value={cargo}
                onChange={e => setCargo(e.target.value)}
                placeholder="Ex: Assessor Jurídico"
                className="form-control"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-fg2 mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              placeholder="Uma breve descrição sobre você..."
              className="form-control resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-fg2 mb-1">E-mail</label>
            <input
              value={userEmail}
              disabled
              className="w-full px-3 py-2 border rounded-lg text-sm bg-background text-fg4 cursor-not-allowed"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={salvar.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: '#0089ac' }}
          >
            <Save className="w-4 h-4" />
            {salvar.isPending ? 'Salvando...' : 'Salvar perfil'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Award className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold text-fg2">Meus feitos</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <StatCard icon={Users} label="Leads captados" value={meusLeads} iconBg="rgba(59,130,246,0.15)" iconColor="#93c5fd" />
          <StatCard icon={Calendar} label="Reuniões realizadas" value={minhasReunioes} iconBg="rgba(16,185,129,0.15)" iconColor="#6ee7b7" />
          <StatCard icon={FileText} label="Contratos fechados" value={meusContratos} iconBg="rgba(139,92,246,0.15)" iconColor="#a78bfa" />
        </div>
      </div>

      {/* ── Minha Performance ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold text-fg2">Minha Performance</h2>
          {meusPontos && (
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(0,137,172,0.15)', color: '#6bd0e7', border: '1px solid rgba(0,137,172,0.3)' }}>
              #{meusPontos.rank} no ranking
            </span>
          )}
        </div>

        {/* Points summary */}
        {meusPontos ? (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-card rounded-xl border p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(0,137,172,0.15)', color: '#6bd0e7' }}>
                <Star className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{meusPontos.pontos_mes}</p>
                <p className="text-xs text-muted-foreground">pontos este mês</p>
              </div>
            </div>
            <div className="bg-card rounded-xl border p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{meusPontos.pontos}</p>
                <p className="text-xs text-muted-foreground">pontos totais</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-xl border p-4 mb-4 text-sm text-muted-foreground">
            Nenhuma atividade registrada ainda.
          </div>
        )}

        {/* Monthly goals progress */}
        <div className="bg-card rounded-xl border p-4 mb-4 space-y-3">
          <p className="text-xs font-semibold text-fg4 uppercase tracking-wider mb-2">Metas do time este mês</p>
          <MiniGoalBar
            label="Deals fechados"
            value={teamProgress.leads_fechados_mes}
            meta={teamProgress.metas.meta_leads_mes}
            icon={Target}
          />
          <MiniGoalBar
            label="Diagnósticos"
            value={teamProgress.diagnosticos_mes}
            meta={teamProgress.metas.meta_diagnosticos_mes}
            icon={Stethoscope}
          />
          <MiniGoalBar
            label="Reuniões realizadas"
            value={teamProgress.reunioes_mes}
            meta={teamProgress.metas.meta_reunioes_mes}
            icon={Calendar}
          />
        </div>

        {/* Badges */}
        {meusPontos && meusPontos.badges.length > 0 && (
          <div className="bg-card rounded-xl border p-4 mb-4">
            <p className="text-xs font-semibold text-fg4 uppercase tracking-wider mb-3">Conquistas desbloqueadas</p>
            <div className="flex flex-wrap gap-2">
              {meusPontos.badges.map(b => (
                <div
                  key={b.id}
                  title={b.description}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                    'border cursor-default'
                  )}
                  style={{ background: 'rgba(0,137,172,0.10)', border: '1px solid rgba(0,137,172,0.25)', color: '#6bd0e7' }}
                >
                  <span>{b.emoji}</span>
                  {b.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent leads touched */}
        {meusPontos && (
          <div className="bg-card rounded-xl border p-4">
            <p className="text-xs font-semibold text-fg4 uppercase tracking-wider mb-3">Minha atividade em leads</p>
            <div className="grid grid-cols-4 gap-3 text-center">
              {[
                { label: 'Prospectados', value: meusPontos.leads_prospectados, color: '#6bd0e7' },
                { label: 'Fechados', value: meusPontos.leads_fechados, color: '#10b981' },
                { label: 'Diagnósticos', value: meusPontos.diagnosticos, color: '#a78bfa' },
                { label: 'Reuniões', value: meusPontos.reunioes, color: '#f59e0b' },
              ].map(item => (
                <div key={item.label} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <p className="text-xl font-bold" style={{ color: item.color }}>{item.value}</p>
                  <p className="text-xs text-fg4 mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
