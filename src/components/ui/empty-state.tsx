import { cn } from '@/lib/utils'
import { Button } from './button'

interface EmptyStateProps {
  icon: React.FC<{ className?: string }>
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="w-14 h-14 rounded-2xl bg-[rgba(255,255,255,0.04)] flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-[rgba(100,120,140,0.55)]" />
      </div>
      <h3 className="text-sm font-semibold text-[rgba(215,225,235,0.85)] mb-1">{title}</h3>
      <p className="text-xs text-[rgba(100,120,140,0.55)] max-w-xs leading-relaxed">{description}</p>
      {action && (
        <Button
          size="sm"
          className="mt-5 bg-primary hover:bg-primary/90 text-white"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
