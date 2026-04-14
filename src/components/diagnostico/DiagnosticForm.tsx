import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useSaveDiagnostico } from '@/hooks/useDiagnostico'
import { useAnalyzeDiagnostico } from '@/hooks/useAnalyzeDiagnostico'
import { DiagnosticResult } from './DiagnosticResult'
import type { Diagnostico } from '@/types'
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SECTIONS } from '@/lib/diagnostic-questions'
import { toast } from 'sonner'

type Phase = 'form' | 'saving' | 'analyzing' | 'done'

type Props = {
  leadId: string
  existingAnswers?: Partial<Diagnostico> | null
}

export function DiagnosticForm({ leadId, existingAnswers }: Props) {
  const save = useSaveDiagnostico()
  const analyze = useAnalyzeDiagnostico()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Partial<Diagnostico>>(existingAnswers || {})
  const [phase, setPhase] = useState<Phase>('form')

  const section = SECTIONS[step]
  const progress = ((step + 1) / SECTIONS.length) * 100

  function setAnswer(key: keyof Diagnostico, value: string) {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit() {
    setPhase('saving')
    try {
      await save.mutateAsync({ leadId, answers })
      setPhase('analyzing')
      await analyze.mutateAsync(answers, {
        onSuccess: () => setPhase('done'),
        onError: () => {
          toast.error('Análise de IA falhou — verifique a chave VITE_ANTHROPIC_API_KEY')
          setPhase('done')
        },
      })
    } catch {
      setPhase('form')
    }
  }

  if (phase === 'saving') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Salvando diagnóstico...</p>
      </div>
    )
  }

  if (phase === 'analyzing') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <Sparkles className="w-8 h-8 text-indigo-500 animate-pulse" />
        <p className="text-sm font-medium text-fg2">Analisando com IA...</p>
        <p className="text-xs text-fg4">Identificando necessidades e serviços adequados</p>
      </div>
    )
  }

  if (phase === 'done' && analyze.data) {
    return (
      <DiagnosticResult
        analise={analyze.data}
        onRedo={() => {
          setPhase('form')
          setStep(0)
          analyze.reset()
        }}
      />
    )
  }

  // phase === 'form' (or 'done' without AI data)
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex gap-1.5">
            {SECTIONS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setStep(i)}
                className={cn(
                  'w-7 h-7 rounded-full text-xs font-bold transition-colors',
                  i === step
                    ? 'bg-indigo-600 text-white'
                    : i < step
                    ? 'bg-indigo-200 text-indigo-700'
                    : 'bg-[rgba(255,255,255,0.04)] text-fg4'
                )}
                title={s.title}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">{step + 1} / {SECTIONS.length}</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{section.emoji} {section.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {section.questions.map((question) => (
            <div key={String(question.key)}>
              <p className="text-sm font-medium text-foreground mb-3">{question.label}</p>
              <div className="space-y-2">
                {question.options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAnswer(question.key, option.value)}
                    className={cn(
                      'w-full text-left px-3.5 py-2.5 rounded-lg border text-sm transition-colors',
                      answers[question.key] === option.value
                        ? 'bg-[rgba(0,137,172,0.15)] border-primary text-[#6bd0e7] font-medium'
                        : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.10)] text-fg2 hover:border-primary/40 hover:bg-primary/10'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
          className="gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Anterior
        </Button>
        {step < SECTIONS.length - 1 ? (
          <Button
            onClick={() => setStep(s => s + 1)}
            className="gap-1.5 bg-primary hover:bg-primary/90"
          >
            Próximo <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={phase !== 'form'}
            className="gap-1.5 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="w-4 h-4" />
            Concluir e Analisar
          </Button>
        )}
      </div>
    </div>
  )
}
