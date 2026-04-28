import { useState } from 'react'
import { usePortalPerfil, useEnviarIndicacaoPortal } from '@/hooks/usePortal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserPlus, Coins, CheckCircle2 } from 'lucide-react'
import { SEGMENTS } from '@/lib/constants'

const SEGMENTOS = SEGMENTS.map(s => s.label)

export function PortalIndicarPage() {
  const { data: perfil } = usePortalPerfil()
  const { mutate: enviarIndicacao, isPending } = useEnviarIndicacaoPortal()

  const [form, setForm] = useState({ nome: '', empresa: '', telefone: '', email: '', segmento: '' })
  const [enviado, setEnviado] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!perfil) return
    enviarIndicacao(
      {
        form,
        perfilId: perfil.id,
        clienteId: perfil.cliente_id ?? null,
        saldoAtual: perfil.tokens_saldo ?? 0,
        historicoTotal: perfil.tokens_historico_total ?? 0,
      },
      {
        onSuccess: () => {
          setEnviado(true)
          setForm({ nome: '', empresa: '', telefone: '', email: '', segmento: '' })
        },
      }
    )
  }

  if (enviado) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.3)' }}>
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Indicação enviada!</h2>
        <p style={{ fontSize: 14, color: 'rgba(107,208,231,0.7)', lineHeight: 1.6, marginBottom: 6 }}>
          +100 tokens foram creditados na sua carteira.
        </p>
        <p style={{ fontSize: 13, color: 'rgba(107,208,231,0.45)', lineHeight: 1.6, marginBottom: 24 }}>
          A equipe CONSEJ entrará em contato com a empresa indicada.
          Quando ela realizar um diagnóstico, você ganha mais <strong style={{ color: '#6bd0e7' }}>+200 tokens</strong>.
          Se fechar contrato, <strong style={{ color: '#6bd0e7' }}>+1.000 a 3.000 tokens</strong>!
        </p>
        <Button
          className="text-white"
          style={{ background: 'linear-gradient(135deg, #0089ac, #006d88)', border: 'none' }}
          onClick={() => setEnviado(false)}
        >
          Indicar outra empresa
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(0,137,172,0.15)', border: '1px solid rgba(0,137,172,0.3)' }}>
            <UserPlus className="w-5 h-5" style={{ color: '#6bd0e7' }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>Indicar empresa ou pessoa</h1>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(107,208,231,0.6)', lineHeight: 1.6 }}>
          Preencha os dados de quem você quer indicar para os serviços da CONSEJ.
          A equipe entrará em contato e você acompanha o andamento pela sua carteira.
        </p>
      </div>

      {/* Recompensa preview */}
      <div className="rounded-xl p-4 mb-7 flex items-center gap-3"
        style={{ background: 'rgba(0,137,172,0.08)', border: '1px solid rgba(0,137,172,0.2)' }}>
        <Coins className="w-5 h-5 shrink-0" style={{ color: '#6bd0e7' }} />
        <div style={{ fontSize: 13, color: 'rgba(107,208,231,0.8)', lineHeight: 1.5 }}>
          <strong style={{ color: '#fff' }}>+100 tokens</strong> ao enviar •{' '}
          <strong style={{ color: '#fff' }}>+200</strong> no diagnóstico •{' '}
          <strong style={{ color: '#fff' }}>+1.000–3.000</strong> no fechamento
        </div>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="nome" style={{ color: 'rgba(107,208,231,0.7)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Nome *
            </Label>
            <Input
              id="nome" name="nome" value={form.nome} onChange={handleChange} required
              placeholder="João Silva"
              style={{ marginTop: 6, background: 'rgba(0,8,29,0.6)', border: '1px solid rgba(107,208,231,0.2)', color: '#fff' }}
              className="placeholder:text-[rgba(107,208,231,0.3)] focus:border-[rgba(0,137,172,0.5)]"
            />
          </div>
          <div>
            <Label htmlFor="empresa" style={{ color: 'rgba(107,208,231,0.7)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Empresa *
            </Label>
            <Input
              id="empresa" name="empresa" value={form.empresa} onChange={handleChange} required
              placeholder="Empresa Ltda"
              style={{ marginTop: 6, background: 'rgba(0,8,29,0.6)', border: '1px solid rgba(107,208,231,0.2)', color: '#fff' }}
              className="placeholder:text-[rgba(107,208,231,0.3)] focus:border-[rgba(0,137,172,0.5)]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="telefone" style={{ color: 'rgba(107,208,231,0.7)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Telefone / WhatsApp *
            </Label>
            <Input
              id="telefone" name="telefone" value={form.telefone} onChange={handleChange} required
              placeholder="(84) 99999-0000"
              style={{ marginTop: 6, background: 'rgba(0,8,29,0.6)', border: '1px solid rgba(107,208,231,0.2)', color: '#fff' }}
              className="placeholder:text-[rgba(107,208,231,0.3)] focus:border-[rgba(0,137,172,0.5)]"
            />
          </div>
          <div>
            <Label htmlFor="email" style={{ color: 'rgba(107,208,231,0.7)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              E-mail
            </Label>
            <Input
              id="email" name="email" type="email" value={form.email} onChange={handleChange}
              placeholder="joao@empresa.com"
              style={{ marginTop: 6, background: 'rgba(0,8,29,0.6)', border: '1px solid rgba(107,208,231,0.2)', color: '#fff' }}
              className="placeholder:text-[rgba(107,208,231,0.3)] focus:border-[rgba(0,137,172,0.5)]"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="segmento" style={{ color: 'rgba(107,208,231,0.7)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Segmento de interesse
          </Label>
          <select
            id="segmento" name="segmento" value={form.segmento} onChange={handleChange}
            style={{
              marginTop: 6, width: '100%', height: 40, paddingLeft: 12, paddingRight: 12,
              background: 'rgba(0,8,29,0.6)', border: '1px solid rgba(107,208,231,0.2)',
              borderRadius: 8, color: form.segmento ? '#fff' : 'rgba(107,208,231,0.3)', fontSize: 14,
            }}
          >
            <option value="">Selecione o segmento (opcional)</option>
            {SEGMENTOS.map(s => (
              <option key={s} value={s} style={{ background: '#00081d', color: '#fff' }}>{s}</option>
            ))}
          </select>
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="w-full text-white font-semibold mt-2"
          style={{ background: 'linear-gradient(135deg, #0089ac, #006d88)', border: 'none', height: 44, fontSize: 15 }}
        >
          {isPending ? 'Enviando...' : 'Enviar indicação (+100 tokens)'}
        </Button>
      </form>

      <p style={{ fontSize: 11, color: 'rgba(107,208,231,0.35)', textAlign: 'center', marginTop: 16, lineHeight: 1.6 }}>
        Ao indicar, você concorda com o{' '}
        <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>Regulamento do Programa de Indicações</span>.
        Limite de 10 indicações ativas simultâneas.
      </p>
    </div>
  )
}
