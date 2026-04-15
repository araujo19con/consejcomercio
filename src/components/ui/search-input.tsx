import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({ value, onChange, placeholder = 'Buscar…', className }: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg4 pointer-events-none" />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 pl-8 pr-7 w-full rounded-lg text-xs bg-[var(--alpha-bg-xs)] border border-[var(--alpha-border-md)] text-fg2 placeholder:text-muted-foreground/60 outline-none focus:border-[rgba(0,137,172,0.50)] focus:ring-1 focus:ring-[rgba(0,137,172,0.30)] transition-colors"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-fg4 hover:text-[rgba(180,195,210,0.75)] transition-colors"
          aria-label="Limpar busca"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}
