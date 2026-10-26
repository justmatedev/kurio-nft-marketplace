import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { Search, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

function readQ(search: unknown): string {
  if (search && typeof search === 'object' && 'q' in search) {
    const q = (search as { q?: unknown }).q
    return typeof q === 'string' ? q : ''
  }
  return ''
}

function scrollToCatalog() {
  document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })
}

export function HeaderSearch() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const urlQ = useRouterState({ select: (s) => readQ(s.location.search) })
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(urlQ)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelId = useId()

  useEffect(() => {
    setDraft(urlQ)
    if (urlQ) setOpen(true)
  }, [urlQ])

  useEffect(() => {
    if (!open) return
    const id = window.setTimeout(() => inputRef.current?.focus(), 30)
    return () => window.clearTimeout(id)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setDraft(urlQ)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, urlQ])

  useEffect(() => {
    if (!open) return
    const next = draft.trim() || undefined
    const current = urlQ.trim() || undefined
    if (next === current) return
    const id = window.setTimeout(() => {
      void navigate({
        to: '/',
        resetScroll: false,
        hash: 'catalogo',
        search: (prev) => {
          const base = typeof prev === 'object' && prev ? { ...prev } : {}
          return {
            ...base,
            q: next,
            page: 1,
          }
        },
      })
      if (pathname === '/') scrollToCatalog()
    }, 320)
    return () => window.clearTimeout(id)
  }, [draft, urlQ, navigate, pathname, open])

  const close = () => {
    setOpen(false)
    setDraft(urlQ)
  }

  const clear = () => {
    setDraft('')
    void navigate({
      to: '/',
      resetScroll: false,
      hash: 'catalogo',
      search: (prev) => {
        const base = typeof prev === 'object' && prev ? { ...prev } : {}
        return { ...base, q: undefined, page: 1 }
      },
    })
    inputRef.current?.focus()
  }

  return (
    <div className="relative flex items-center">
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center text-white/90 hover:text-white"
        aria-label="Buscar NFTs"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <Search className="h-5 w-5" strokeWidth={1.75} />
      </button>

      {/* Desktop: campo expansível ao lado da lupa */}
      <div
        id={panelId}
        className={cn(
          'absolute right-0 top-1/2 z-50 hidden -translate-y-1/2 items-center md:flex',
          'origin-right transition-all duration-200',
          open
            ? 'pointer-events-auto w-[280px] opacity-100 lg:w-[320px]'
            : 'pointer-events-none w-0 opacity-0',
        )}
      >
        <div className="flex h-10 w-full items-center gap-1 rounded-[8px] border border-border bg-card pl-3 pr-1 shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
          <input
            ref={inputRef}
            type="search"
            value={draft}
            placeholder="Buscar NFTs..."
            aria-label="Buscar NFTs"
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-placeholder"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                scrollToCatalog()
              }
            }}
          />
          {draft ? (
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center text-text-secondary hover:text-foreground"
              aria-label="Limpar busca"
              onClick={clear}
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          ) : (
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center text-text-secondary hover:text-foreground"
              aria-label="Fechar busca"
              onClick={close}
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Mobile: painel sob o header */}
      {open ? (
        <div className="fixed inset-x-0 top-20 z-50 border-b border-border bg-card px-6 py-3 md:hidden">
          <div className="mx-auto flex max-w-[1440px] items-center gap-2">
            <div className="flex h-11 flex-1 items-center gap-2 rounded-[8px] border border-border bg-background px-3">
              <Search className="h-4 w-4 shrink-0 text-text-secondary" strokeWidth={1.75} aria-hidden />
              <input
                type="search"
                value={draft}
                placeholder="Buscar NFTs..."
                aria-label="Buscar NFTs"
                className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-placeholder"
                autoFocus
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    setOpen(false)
                    scrollToCatalog()
                  }
                }}
              />
              {draft ? (
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center text-text-secondary"
                  aria-label="Limpar busca"
                  onClick={clear}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <button
              type="button"
              className="shrink-0 px-2 text-sm text-text-secondary hover:text-foreground"
              onClick={close}
            >
              Fechar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
