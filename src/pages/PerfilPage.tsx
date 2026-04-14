import { useState, useEffect, useRef } from 'react'
import { Camera, Save, Award, Calendar, Users, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useMeuPerfil, useSalvarPerfil, useUploadAvatar } from '@/hooks/usePerfis'
import { useLeads } from '@/hooks/useLeads'
import { useReunioes } from '@/hooks/useReunioes'
import { useContratos } from '@/hooks/useContratos'
import { toast } from 'sonner'

function StatCard({ icon: Icon, label, value, iconBg, iconColor }: {
  icon: React.ElementType
  label: string
  value: number
  iconBg: string
  iconColor: string
}) {
  return (
    <div className="bg-card rounded-xl p-5 flex items-center gap-4" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: iconBg, color: iconColor }}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-[rgba(230,235,240,0.92)]">{value}</p>
        <p className="text-sm text-[rgba(130,150,170,0.65)]">{label}</p>
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
    try {
      const url = await uploadAvatar.mutateAsync({ userId, file })
      setFotoUrl(url)
      await salvar.mutateAsync({ id: userId, nome, cargo, bio, foto_url: url, email: userEmail })
      toast.success('Foto atualizada!')
    } catch {
      toast.error('Erro ao enviar foto. Verifique se o bucket "avatars" está criado no Supabase Storage.')
    }
  }

  if (isLoading) return <div className="text-center py-16 text-[rgba(100,120,140,0.55)]">Carregando...</div>

  const initials = nome ? nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[rgba(230,235,240,0.95)]">Meu Perfil</h1>
        <p className="text-[rgba(130,150,170,0.65)] text-sm mt-0.5">Gerencie suas informações pessoais</p>
      </div>

      {/* Avatar + info */}
      <div className="bg-card rounded-2xl border p-6">
        <div className="flex items-center gap-6 mb-6">
          {/* Avatar */}
          <div className="relative">
            <div
              className="w-24 h-24 rounded-2xl overflow-hidden flex items-center justify-center text-white text-2xl font-bold cursor-pointer"
              style={{ backgroundColor: '#0089ac' }}
              onClick={() => fileRef.current?.click()}
            >
              {fotoUrl ? (
                <img src={fotoUrl} alt={nome} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center hover:bg-[rgba(255,255,255,0.10)]" style={{ background: '#162035', border: '2px solid rgba(255,255,255,0.12)' }}
            >
              <Camera className="w-3.5 h-3.5 text-[rgba(130,150,170,0.65)]" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          <div>
            <p className="text-xl font-semibold text-[rgba(230,235,240,0.92)]">{nome || 'Sem nome'}</p>
            <p className="text-[rgba(130,150,170,0.65)] text-sm">{cargo || 'Sem cargo'}</p>
            <p className="text-[rgba(100,120,140,0.55)] text-xs mt-0.5">{userEmail}</p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[rgba(215,225,235,0.85)] mb-1">Nome *</label>
              <input
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Seu nome completo"
                className="form-control"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[rgba(215,225,235,0.85)] mb-1">Cargo</label>
              <input
                value={cargo}
                onChange={e => setCargo(e.target.value)}
                placeholder="Ex: Assessor Jurídico"
                className="form-control"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[rgba(215,225,235,0.85)] mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              placeholder="Uma breve descrição sobre você..."
              className="form-control resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[rgba(215,225,235,0.85)] mb-1">E-mail</label>
            <input
              value={userEmail}
              disabled
              className="w-full px-3 py-2 border rounded-lg text-sm bg-background text-[rgba(100,120,140,0.55)] cursor-not-allowed"
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
          <Award className="w-5 h-5 text-[rgba(130,150,170,0.65)]" />
          <h2 className="font-semibold text-[rgba(215,225,235,0.85)]">Meus feitos</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <StatCard icon={Users} label="Leads captados" value={meusLeads} iconBg="rgba(59,130,246,0.15)" iconColor="#93c5fd" />
          <StatCard icon={Calendar} label="Reuniões realizadas" value={minhasReunioes} iconBg="rgba(16,185,129,0.15)" iconColor="#6ee7b7" />
          <StatCard icon={FileText} label="Contratos fechados" value={meusContratos} iconBg="rgba(139,92,246,0.15)" iconColor="#a78bfa" />
        </div>
      </div>
    </div>
  )
}
