import { useSessionGuard } from '@/features/auth/session-guard'
import { useOwnerId } from '@/shared/api/query-keys'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import type { Nft } from '@/shared/api/types'
import { endpoints } from '@/shared/api/endpoints'
import { useAuthModal } from '@/features/auth/auth-modal'
import { useAuth } from '@/features/auth/session'
import { formatEth } from '@/shared/lib/eth'
import { nftImageSources } from '@/shared/lib/nft-image'
import { cn } from '@/shared/lib/utils'
import { Skeleton } from '@/shared/ui/skeleton'

export function NftCard({ nft, priority = false }: { nft: Nft; priority?: boolean }) {
  const ownerId = useOwnerId()
  const isCurrentSession = useSessionGuard()
  const { isAuthenticated } = useAuth()
  const { openAuth } = useAuthModal()
  const queryClient = useQueryClient()

  const price =
    nft.editions.find((e) => e.label === 'ABERTA')?.priceEth ??
    nft.editions.find((e) => e.label === '1/50')?.priceEth ??
    nft.editions[0]?.priceEth ??
    '0'
  const idNum = Number(nft.id.replace(/\D/g, '')) || 0
  const showCompare = idNum % 4 === 0
  const showRaro = idNum % 3 === 0
  const compareAt = showCompare
    ? nft.editions.find((e) => e.label === '1/10')?.priceEth
    : undefined

  const favoritesQuery = useQuery({
    queryKey: ['favorites', ownerId],
    queryFn: ({ signal }) => endpoints.favorites(signal),
    enabled: isAuthenticated,
  })
  const favorited = favoritesQuery.data?.some((f) => f.nftId === nft.id) ?? false

  const favMutation = useMutation({
    mutationFn: async () => {
      if (favorited) return endpoints.removeFavorite(nft.id)
      return endpoints.addFavorite(nft.id)
    },
    onMutate: async () => {
      if (!isAuthenticated) {
        openAuth('login', '/')
        throw new Error('auth')
      }
      await queryClient.cancelQueries({ queryKey: ['favorites', ownerId] })
      const prev = queryClient.getQueryData(['favorites', ownerId])
      queryClient.setQueryData(['favorites', ownerId], (old: Array<{ nftId: string }> | undefined) => {
        const list = old ?? []
        if (favorited) return list.filter((f) => f.nftId !== nft.id)
        return [...list, { nftId: nft.id, createdAt: new Date().toISOString() }]
      })
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (!isCurrentSession()) return
      if (ctx?.prev) queryClient.setQueryData(['favorites', ownerId], ctx.prev)
      if (_e instanceof Error && _e.message === 'auth') return
      toast.error('Não foi possível atualizar favoritos')
    },
    onSettled: () => {
      if (!isCurrentSession()) return
      void queryClient.invalidateQueries({ queryKey: ['favorites', ownerId] })
    },
  })

  const img = nftImageSources(nft.imageUrl)

  return (
    <div className="group relative space-y-3">
      <Link to="/nfts/$id" params={{ id: nft.id }} className="block transition">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#e8e0d4]">
          <img
            src={img.src}
            srcSet={img.srcSet}
            sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
            alt={nft.name}
            width={640}
            height={640}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
          />
          {showRaro ? (
            <span className="absolute left-2.5 top-2.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-primary-foreground uppercase">
              Raro
            </span>
          ) : null}
        </div>
        <div className="mt-3 space-y-1">
          <h3 className="text-sm font-medium leading-tight text-foreground">{nft.name}</h3>
          <p className="flex flex-wrap items-baseline gap-2 text-sm">
            <span className="font-semibold text-primary">{formatEth(price, 2)} ETH</span>
            {compareAt ? (
              <span className="text-text-secondary/70 line-through decoration-text-secondary/50">
                {formatEth(compareAt, 2)} ETH
              </span>
            ) : null}
          </p>
        </div>
      </Link>

      <button
        type="button"
        className={cn(
          'absolute right-2.5 top-2.5 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full',
          'border border-white/25 bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/50',
        )}
        aria-label={favorited ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
        aria-pressed={favorited}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          favMutation.mutate()
        }}
      >
        <Heart
          className={cn('h-3.5 w-3.5', favorited && 'fill-primary text-primary')}
          strokeWidth={1.75}
        />
      </button>
    </div>
  )
}

export function NftGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-4 md:grid-cols-3"
      aria-busy="true"
      aria-label="Carregando catálogo"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  )
}
