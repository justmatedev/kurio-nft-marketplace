import { Link } from '@tanstack/react-router'
import type { Nft } from '@/shared/api/types'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { SortSelect } from '@/features/catalog/sort-select'

export const SIDEBAR_COLLECTIONS = [
  'Arte digital',
  'Fotografia',
  'Música',
  'Arte 3D',
  'Colecionáveis',
  'Generativa',
  'Jogos',
  'Assinaturas',
  'Utilidade',
] as const

export const SIDEBAR_NETWORKS = ['Ethereum', 'Polygon', 'Solana'] as const

export const PRICE_MIN = 0.02
export const PRICE_MAX = 12.3

function formatPriceBr(value: string | number) {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  return n.toFixed(2).replace('.', ',')
}

export type CatalogFilterSearch = {
  collection?: string
  network?: string
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'oldest'
}

type Props = {
  search: CatalogFilterSearch
  collectionCounts: Map<string, number>
  networkCounts: Map<string, number>
  minDraft: string
  maxDraft: string
  setMinDraft: (v: string) => void
  setMaxDraft: (v: string) => void
  onUpdate: (patch: Partial<CatalogFilterSearch & { minPrice?: string; maxPrice?: string; tab?: 'all' }>) => void
  featured?: Nft
  showSort?: boolean
  showFeatured?: boolean
}

export function CatalogFilters({
  search,
  collectionCounts,
  networkCounts,
  minDraft,
  maxDraft,
  setMinDraft,
  setMaxDraft,
  onUpdate,
  featured,
  showSort = false,
  showFeatured = true,
}: Props) {
  return (
    <div className="space-y-8">
      {showSort ? (
        <div>
          <h2 className="mb-4 text-sm font-semibold text-foreground">Ordenar</h2>
          <SortSelect
            value={search.sort ?? 'newest'}
            onChange={(sort) => onUpdate({ sort, tab: 'all' })}
          />
        </div>
      ) : null}

      <div>
        <h2 className="mb-4 text-sm font-semibold text-foreground">Coleções</h2>
        <ul className="space-y-2.5">
          {SIDEBAR_COLLECTIONS.map((label) => {
            const active = search.collection === label
            const count = collectionCounts.get(label) ?? 0
            return (
              <li key={label}>
                <button
                  type="button"
                  className={cn(
                    'block w-full text-left text-sm transition',
                    active ? 'text-primary' : 'text-text-secondary hover:text-foreground',
                  )}
                  onClick={() =>
                    onUpdate({
                      collection: active ? undefined : label,
                    })
                  }
                >
                  {label}{' '}
                  <span className={cn(active ? 'text-primary' : 'text-text-secondary')}>
                    ({count})
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div>
        <h2 className="mb-4 text-sm font-semibold text-foreground">Faixa de preço</h2>
        <div className="space-y-3">
          <div className="relative h-6">
            <div className="absolute top-1/2 h-0.5 w-full -translate-y-1/2 rounded-full bg-primary/30" />
            <div
              className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-primary"
              style={{
                left: `${((Number(minDraft) - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100}%`,
                right: `${100 - ((Number(maxDraft) - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100}%`,
              }}
            />
            <input
              type="range"
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={0.01}
              value={Number(minDraft) || PRICE_MIN}
              onChange={(e) => {
                const next = Math.min(Number(e.target.value), Number(maxDraft) - 0.01)
                setMinDraft(next.toFixed(2))
              }}
              className="range-thumb absolute inset-0 z-20 w-full appearance-none bg-transparent"
              aria-label="Preço mínimo"
            />
            <input
              type="range"
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={0.01}
              value={Number(maxDraft) || PRICE_MAX}
              onChange={(e) => {
                const next = Math.max(Number(e.target.value), Number(minDraft) + 0.01)
                setMaxDraft(next.toFixed(2))
              }}
              className="range-thumb absolute inset-0 z-30 w-full appearance-none bg-transparent"
              aria-label="Preço máximo"
            />
          </div>
          <p className="text-sm text-text-secondary">
            Preço: {formatPriceBr(minDraft)} - {formatPriceBr(maxDraft)} ETH
          </p>
          <Button
            size="sm"
            className="px-6"
            onClick={() =>
              onUpdate({
                minPrice: minDraft || undefined,
                maxPrice: maxDraft || undefined,
              })
            }
          >
            Aplicar
          </Button>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-sm font-semibold text-foreground">Rede</h2>
        <ul className="space-y-2.5 text-sm">
          {SIDEBAR_NETWORKS.map((label) => {
            const active = search.network === label
            const count = networkCounts.get(label) ?? 0
            return (
              <li key={label}>
                <button
                  type="button"
                  className={cn(
                    'block w-full text-left transition',
                    active ? 'text-primary' : 'text-text-secondary hover:text-foreground',
                  )}
                  onClick={() =>
                    onUpdate({
                      network: active ? undefined : label,
                    })
                  }
                >
                  {label}{' '}
                  <span className={cn(active ? 'text-primary' : 'text-text-secondary')}>
                    ({count})
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {showFeatured && featured ? (
        <Link to="/nfts/$id" params={{ id: featured.id }} className="block space-y-3 pt-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
              NFT em destaque
            </p>
            <p className="mt-1 text-lg font-bold uppercase tracking-wide text-foreground">
              Oferta limitada
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl bg-[#1a110d]">
            <img
              src={featured.imageUrl}
              alt={featured.name}
              className="aspect-[3/4] w-full object-cover"
            />
          </div>
        </Link>
      ) : null}
    </div>
  )
}
