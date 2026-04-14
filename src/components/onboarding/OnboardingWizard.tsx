import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X, ArrowRight, ArrowLeft, Users, FileText, BarChart2, Target,
  CheckCircle2, KanbanSquare, Inbox, CalendarDays, Share2, Stethoscope,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const ONBOARDING_KEY = 'consej_onboarded'

const STEPS = [
  {
    icon: KanbanSquare,
    title: 'Pipeline de Leads',
    description: 'Todos os contatos entram no Kanban com 9 fases — de Classificação até Ganho ou Perdido. Arraste os cards entre colunas para avançar a negociação.',
    detail: 'Use o filtro de Origem e Segmento para focar em grupos específicos de leads.',
    route: '/leads',
    cta: 'Ver Pipeline',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
  },
  {
    icon: Target,
    title: 'Lista de Prospecção',
    description: 'A Prospecção mostra leads ativos ordenados por score de prioridade — quem tem contato, diagnóstico e maior potencial aparece primeiro.',
    detail: 'Copie telefone e e-mail direto pelo botão de cópia em cada linha.',
    route: '/prospeccao',
    cta: 'Ver Prospecção',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: Stethoscope,
    title: 'Diagnóstico Comercial',
    description: 'Aplique o diagnóstico guiado junto com o lead para identificar urgências jurídicas. O sistema recomenda automaticamente o serviço ideal.',
    detail: 'Um diagnóstico completo aumenta o score do lead e melhora a proposta.',
    route: '/diagnosticos',
    cta: 'Ver Diagnósticos',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
  },
  {
    icon: Users,
    title: 'Clientes & Contratos',
    description: 'Quando um lead é ganho, ele vira cliente automaticamente. Cada cliente tem contratos, NPS, indicações, oportunidades e histórico completo.',
    detail: 'Contratos expirando em 30 dias aparecem em laranja no Dashboard.',
    route: '/clientes',
    cta: 'Ver Clientes',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: Inbox,
    title: 'Demandas',
    description: 'Demandas são os serviços jurídicos executados dentro de um contrato ativo. Cada demanda tem tipo (simples R$200 / complexa R$500) e status de andamento.',
    detail: 'Demandas concluídas alimentam o cálculo de receita no Analytics.',
    route: '/demandas',
    cta: 'Ver Demandas',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
  },
  {
    icon: CalendarDays,
    title: 'Reuniões',
    description: 'Agende reuniões com link de vídeo, participantes e duração. O calendário semanal mostra tudo organizado por dia.',
    detail: 'Cole o link do Google Meet ou Zoom para entrar direto pelo card.',
    route: '/reunioes',
    cta: 'Ver Reuniões',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
  },
  {
    icon: Share2,
    title: 'Indicações & Parceiros',
    description: 'Registre quem indicou quem e acompanhe recompensas. Parceiros estratégicos geram leads qualificados — cadastre-os e vincule os leads que enviarem.',
    detail: 'Clientes NPS ≥ 9 são candidatos ideais para pedir indicações.',
    route: '/indicacoes',
    cta: 'Ver Indicações',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
  },
  {
    icon: BarChart2,
    title: 'Analytics Comercial',
    description: 'Win rate, funil de conversão, performance por responsável e motivos de perda. Identifique gargalos e oportunidades de melhoria.',
    detail: 'Filtro por período para comparar performance entre meses.',
    route: '/analytics',
    cta: 'Ver Analytics',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    icon: FileText,
    title: 'Manual completo disponível',
    description: 'Acesse a Central de Ajuda a qualquer momento pelo menu lateral (ícone ?) para ver o guia detalhado de cada módulo, dicas e o fluxo comercial completo.',
    detail: 'Use Ctrl+K para busca rápida entre todos os módulos a qualquer momento.',
    route: '/ajuda',
    cta: 'Ver Ajuda',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: CheckCircle2,
    title: 'Tudo pronto!',
    description: 'O CONSEJ CRM está configurado com seus dados importados. Explore os módulos no menu lateral e registre novos leads a qualquer momento.',
    detail: null,
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
    if (!localStorage.getItem(ONBOARDING_KEY)) {
      setOpen(true)
    }
  }, [])

  function handleClose() {
    localStorage.setItem(ONBOARDING_KEY, '1')
    setOpen(false)
    setStep(0)
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
  const progress = Math.round(((step) / (STEPS.length - 1)) * 100)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,8,29,0.80)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl"
        style={{
          background: 'linear-gradient(145deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)',
          border: '1px solid hsl(var(--border))',
        }}
      >
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Progress bar */}
        <div className="px-6 pt-5 pb-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-muted-foreground font-medium">
              Passo {step + 1} de {STEPS.length}
            </span>
            <span className="text-[11px] text-muted-foreground">{progress}%</span>
          </div>
          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 text-center">
          <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5', current.bg)}>
            <Icon className={cn('w-8 h-8', current.color)} />
          </div>

          <h2 className="text-xl font-bold text-foreground mb-3">{current.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{current.description}</p>

          {current.detail && (
            <div className="mt-3 px-4 py-2.5 rounded-lg bg-muted/60 text-xs text-muted-foreground text-left flex gap-2">
              <span className="text-primary mt-0.5">💡</span>
              <span>{current.detail}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-7 flex items-center justify-between">
          <button
            onClick={() => setStep(s => s - 1)}
            className={cn(
              'flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors',
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
                className="text-xs"
              >
                {current.cta}
              </Button>
            )}
            {!isLast ? (
              <Button
                size="sm"
                onClick={() => setStep(s => s + 1)}
                className="bg-primary hover:bg-primary/90 text-white text-xs"
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
