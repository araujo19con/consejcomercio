import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ArrowRight, ArrowLeft, Users, FileText, BarChart2, Target, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'consej_onboarded'

const STEPS = [
  {
    icon: Users,
    title: 'Pipeline de Leads',
    description: 'Gerencie todos os seus leads em um kanban visual com 7 fases — da classificação até o fechamento. Arraste cards entre colunas para avançar no funil.',
    route: '/leads',
    cta: 'Ver Pipeline',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
  },
  {
    icon: FileText,
    title: 'Clientes & Contratos',
    description: 'Cada cliente convertido tem seu perfil completo: contratos, áreas de atuação, valores, datas de renovação e histórico de atividades em tempo real.',
    route: '/clientes',
    cta: 'Ver Clientes',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: Target,
    title: 'Diagnóstico Comercial',
    description: 'Aplique o diagnóstico guiado com leads para identificar urgências jurídicas e receber uma recomendação automática de serviço — base para montar a proposta.',
    route: '/leads',
    cta: 'Explorar',
    color: 'text-[#6bd0e7]',
    bg: 'bg-[#0089ac]/10',
  },
  {
    icon: BarChart2,
    title: 'Analytics Comercial',
    description: 'Acompanhe win rate, tempo de fechamento, performance por canal e responsável. Identifique gargalos e os principais motivos de perda.',
    route: '/analytics',
    cta: 'Ver Analytics',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    icon: CheckCircle2,
    title: 'Tudo pronto!',
    description: 'O CONSEJ CRM está configurado e com seus dados importados. Explore os módulos no menu lateral e registre novos leads a qualquer momento.',
    route: null,
    cta: null,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
]

export function OnboardingWizard() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setOpen(true)
    }
  }, [])

  function handleClose() {
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  function handleCta(route: string | null) {
    if (route) {
      handleClose()
      navigate(route)
    } else {
      handleClose()
    }
  }

  if (!open) return null

  const current = STEPS[step]
  const Icon = current.icon
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,8,29,0.75)', backdropFilter: 'blur(6px)' }}>
      <div
        className="relative w-full max-w-md rounded-2xl border border-[rgba(255,255,255,0.10)] shadow-2xl"
        style={{ background: 'linear-gradient(145deg, #0d1929 0%, #0a1220 100%)' }}
      >
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-[rgba(100,120,140,0.50)] hover:text-[rgba(180,195,210,0.75)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-6 pb-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                'rounded-full transition-all',
                i === step ? 'w-5 h-1.5 bg-[#6bd0e7]' : i < step ? 'w-1.5 h-1.5 bg-[rgba(107,208,231,0.35)]' : 'w-1.5 h-1.5 bg-[rgba(255,255,255,0.10)]'
              )}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-8 py-6 text-center">
          <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5', current.bg)}>
            <Icon className={cn('w-8 h-8', current.color)} />
          </div>

          <h2 className="text-xl font-bold text-[rgba(230,235,240,0.95)] mb-3">{current.title}</h2>
          <p className="text-sm text-[rgba(150,165,180,0.75)] leading-relaxed">{current.description}</p>
        </div>

        {/* Footer */}
        <div className="px-8 pb-7 flex items-center justify-between">
          <button
            onClick={() => setStep(s => s - 1)}
            className={cn(
              'flex items-center gap-1 text-sm text-[rgba(100,120,140,0.55)] hover:text-[rgba(180,195,210,0.75)] transition-colors',
              step === 0 && 'invisible'
            )}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar
          </button>

          <div className="flex gap-2">
            {current.cta && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCta(current.route)}
                className="text-xs border-[rgba(255,255,255,0.10)] text-[rgba(150,165,180,0.70)] hover:text-[rgba(215,225,235,0.85)]"
              >
                {current.cta}
              </Button>
            )}
            {!isLast ? (
              <Button
                size="sm"
                onClick={() => setStep(s => s + 1)}
                className="bg-[#0089ac] hover:bg-[#007a9a] text-white text-xs"
              >
                Próximo <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleClose}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              >
                Começar <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
