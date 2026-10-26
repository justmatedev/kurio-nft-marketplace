import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Listados recentemente' },
  { value: 'oldest', label: 'Mais antigos' },
  { value: 'price_asc', label: 'Menor preço' },
  { value: 'price_desc', label: 'Maior preço' },
] as const

export type SortValue = (typeof SORT_OPTIONS)[number]['value']

export function SortSelect({
  value,
  onChange,
}: {
  value: SortValue
  onChange: (value: SortValue) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const current = SORT_OPTIONS.find((o) => o.value === value) ?? SORT_OPTIONS[0]!

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative flex items-center gap-2 text-xs text-text-secondary">
      <span id={`${listId}-label`}>Ordenar por:</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={`${listId}-label ${listId}-value`}
        className={cn(
          'inline-flex h-9 items-center gap-2 rounded-[8px] border border-border bg-card px-3 text-sm text-foreground transition',
          'hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          open && 'border-primary/60',
        )}
        onClick={() => setOpen((v) => !v)}
      >
        <span id={`${listId}-value`}>{current.label}</span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 text-text-secondary transition', open && 'rotate-180')}
          strokeWidth={2}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={`${listId}-label`}
          className="absolute right-0 top-[calc(100%+6px)] z-30 min-w-[220px] overflow-hidden rounded-[8px] border border-border bg-card py-1 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
        >
          {SORT_OPTIONS.map((option) => {
            const selected = option.value === value
            return (
              <li key={option.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center px-3 py-2.5 text-left text-sm transition',
                    selected
                      ? 'bg-primary/15 text-primary'
                      : 'text-text-secondary hover:bg-white/5 hover:text-foreground',
                  )}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
                  {option.label}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
