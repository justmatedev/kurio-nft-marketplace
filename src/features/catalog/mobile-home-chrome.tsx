import * as Dialog from '@radix-ui/react-dialog'
import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { CatalogFilters, type CatalogFilterSearch } from '@/features/catalog/catalog-filters'
import type { Nft } from '@/shared/api/types'

type Props = {
  q?: string
  search: CatalogFilterSearch
  collectionCounts: Map<string, number>
  networkCounts: Map<string, number>
  minDraft: string
  maxDraft: string
  setMinDraft: (v: string) => void
  setMaxDraft: (v: string) => void
  onUpdate: (
    patch: Partial<
      CatalogFilterSearch & {
        minPrice?: string
        maxPrice?: string
        q?: string
        tab?: 'all'
        page?: number
      }
    >,
  ) => void
  featured?: Nft
}

export function MobileHomeChrome({
  q,
  search,
  collectionCounts,
  networkCounts,
  minDraft,
  maxDraft,
  setMinDraft,
  setMaxDraft,
  onUpdate,
  featured,
}: Props) {
  const navigate = useNavigate({ from: '/' })
  const [draft, setDraft] = useState(q ?? '')
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    setDraft(q ?? '')
  }, [q])

  useEffect(() => {
    const next = draft.trim() || undefined
    const current = q?.trim() || undefined
    if (next === current) return
    const id = window.setTimeout(() => {
      void navigate({
        to: '/',
        resetScroll: false,
        hash: 'catalogo',
        search: (prev) => ({ ...prev, q: next, page: 1 }),
      })
    }, 320)
    return () => window.clearTimeout(id)
  }, [draft, q, navigate])

  return (
    <Dialog.Root open={filtersOpen} onOpenChange={setFiltersOpen}>
      <div className="sticky top-0 z-30 bg-background px-4 pb-3 pt-4 md:hidden">
        <div className="flex items-center gap-2.5">
          <label className="flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-2xl bg-[#1c1612] px-3.5">
            <Search className="h-4 w-4 shrink-0 text-placeholder" strokeWidth={1.75} aria-hidden />
            <input
              id="mobile-home-search"
              type="search"
              value={draft}
              placeholder="Explorar coleções"
              aria-label="Explorar coleções"
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-placeholder"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })
                }
              }}
            />
          </label>
          <Dialog.Trigger asChild><button
            type="button"
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#3a2a20] text-primary"
            aria-label="Abrir filtros"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal className="h-5 w-5" strokeWidth={1.75} />
          </button></Dialog.Trigger>
        </div>
      </div>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 md:hidden" />
        <Dialog.Content aria-describedby={undefined} className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-card px-5 pb-10 pt-4 shadow-xl md:hidden">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-base font-semibold text-foreground">Filtros</Dialog.Title>
            <Dialog.Close className="inline-flex h-9 w-9 items-center justify-center text-foreground/80" aria-label="Fechar filtros"><X className="h-5 w-5" /></Dialog.Close>
          </div>
            <CatalogFilters
              search={search}
              collectionCounts={collectionCounts}
              networkCounts={networkCounts}
              minDraft={minDraft}
              maxDraft={maxDraft}
              setMinDraft={setMinDraft}
              setMaxDraft={setMaxDraft}
              onUpdate={(patch) => {
                onUpdate(patch)
              }}
              featured={featured}
              showSort
              showFeatured={false}
            />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
