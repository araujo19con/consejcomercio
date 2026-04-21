import { cn } from '@/lib/utils'
import { User, Users } from 'lucide-react'

export type Scope = 'mine' | 'all'

type Props = {
  value: Scope
  onChange: (v: Scope) => void
  mineCount?: number
  allCount?: number
  className?: string
}

/**
 * Toggle canônico "Minhas / Todas" para listagens que aceitam filtro por
 * responsável. Use junto com o hook useMeuPerfil para descobrir o userId.
 */
export function ScopeToggle({ value, onChange, mineCount, allCount, className }: Props) {
  return (
    <div
      className={cn('inline-flex items-center gap-0 rounded-lg border p-0.5', className)}
      style={{ borderColor: 'var(--alpha-border-md)', background: 'var(--alpha-bg-xs)' }}
    >
      <button
        type="button"
        onClick={() => onChange('mine')}
        className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all')}
        style={value === 'mine'
          ? { background: 'rgba(0,137,172,0.18)', color: '#6bd0e7' }
          : { background: 'transparent', color: 'var(--text-soft-a)' }
        }
      >
        <User className="w-3 h-3" />
        Minhas
        {typeof mineCount === 'number' && (
          <span
            className="text-[10px] px-1 rounded-full font-semibold"
            style={value === 'mine'
              ? { background: 'rgba(0,137,172,0.25)', color: '#6bd0e7' }
              : { background: 'var(--alpha-bg-sm)', color: 'var(--text-soft-a)' }
            }
          >
            {mineCount}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => onChange('all')}
        className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all')}
        style={value === 'all'
          ? { background: 'rgba(0,137,172,0.18)', color: '#6bd0e7' }
          : { background: 'transparent', color: 'var(--text-soft-a)' }
        }
      >
        <Users className="w-3 h-3" />
        Todas
        {typeof allCount === 'number' && (
          <span
            className="text-[10px] px-1 rounded-full font-semibold"
            style={value === 'all'
              ? { background: 'rgba(0,137,172,0.25)', color: '#6bd0e7' }
              : { background: 'var(--alpha-bg-sm)', color: 'var(--text-soft-a)' }
            }
          >
            {allCount}
          </span>
        )}
      </button>
    </div>
  )
}
