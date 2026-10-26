import { useSessionGuard } from '@/features/auth/session-guard'
import { useOwnerId } from '@/shared/api/query-keys'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Heart, Mail, Minus, Plus, Search, ShoppingCart, Star } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { endpoints } from '@/shared/api/endpoints'
import { getApiError } from '@/shared/api/client'
import { useAuthModal } from '@/features/auth/auth-modal'
import { useAuth } from '@/features/auth/session'
import { NftCard } from '@/features/catalog/components'
import { formatEth } from '@/shared/lib/eth'
import { nftImageSources } from '@/shared/lib/nft-image'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { cn } from '@/shared/lib/utils'

export const Route = createFileRoute('/nfts/$id')({
  component: NftDetailPage,
})

function NftDetailPage() {
  const ownerId = useOwnerId()
  const isCurrentSession = useSessionGuard()
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { openAuth } = useAuthModal()
  const queryClient = useQueryClient()
  const [editionId, setEditionId] = useState<string | null>(null)
  const [qty, setQty] = useState(1)
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [tab, setTab] = useState<'details' | 'reviews'>('details')
  const [relatedPage, setRelatedPage] = useState(0)

  const nftQuery = useQuery({
    queryKey: ['nft', id],
    queryFn: ({ signal }) => endpoints.getNft(id, signal),
  })

  const favoritesQuery = useQuery({
    queryKey: ['favorites', ownerId],
    queryFn: ({ signal }) => endpoints.favorites(signal),
    enabled: isAuthenticated,
  })

  const cartQuery = useQuery({
    queryKey: ['cart', ownerId],
    queryFn: ({ signal }) => endpoints.cart(signal),
  })
  const cartCount = cartQuery.data?.items.reduce((a, i) => a + i.quantity, 0) ?? 0

  const nft = nftQuery.data
  const relatedQuery = useQuery({
    queryKey: ['nfts', 'related', nft?.collection],
    queryFn: ({ signal }) =>
      endpoints.listNfts({ collection: nft!.collection, pageSize: 15, sort: 'newest' }, signal),
    enabled: Boolean(nft?.collection),
  })

  const selectedEdition =
    nft?.editions.find((e) => e.id === editionId) ??
    nft?.editions.find((e) => e.label === '1/50' && e.available > 0) ??
    nft?.editions.find((e) => e.available > 0) ??
    nft?.editions[0] ??
    null
  const favorited = favoritesQuery.data?.some((f) => f.nftId === nft?.id) ?? false

  const reviewCount = useMemo(() => {
    if (!nft) return 0
    const n = Number(nft.id.replace(/\D/g, '')) || 1
    return 12 + (n % 28)
  }, [nft])

  const rating = useMemo(() => {
    if (!nft) return '4.8'
    const n = Number(nft.id.replace(/\D/g, '')) || 1
    return (4.5 + (n % 5) / 10).toFixed(1)
  }, [nft])

  const related = useMemo(
    () => (relatedQuery.data?.items ?? []).filter((n) => n.id !== nft?.id),
    [relatedQuery.data?.items, nft?.id],
  )
  const relatedPageSize = 5
  const relatedPages = Math.max(1, Math.ceil(related.length / relatedPageSize))
  const relatedSlice = related.slice(
    relatedPage * relatedPageSize,
    relatedPage * relatedPageSize + relatedPageSize,
  )

  const addCart = useMutation({
    mutationFn: () =>
      endpoints.addCartItem({
        nftId: nft!.id,
        editionId: selectedEdition!.id,
        quantity: qty,
      }),
    onSuccess: () => {
      if (!isCurrentSession()) return
      void queryClient.invalidateQueries({ queryKey: ['cart', ownerId] })
      toast.success('Adicionado ao carrinho')
    },
    onError: (e) => { if (isCurrentSession()) toast.error(getApiError(e).message) },
  })

  const favMutation = useMutation({
    mutationFn: async () => {
      if (!nft) return
      if (favorited) return endpoints.removeFavorite(nft.id)
      return endpoints.addFavorite(nft.id)
    },
    onMutate: async () => {
      if (!isAuthenticated) {
        openAuth('login', `/nfts/${id}`)
        throw new Error('auth')
      }
      await queryClient.cancelQueries({ queryKey: ['favorites', ownerId] })
      const prev = queryClient.getQueryData(['favorites', ownerId])
      queryClient.setQueryData(['favorites', ownerId], (old: Array<{ nftId: string }> | undefined) => {
        const list = old ?? []
        if (favorited) return list.filter((f) => f.nftId !== nft?.id)
        return [...list, { nftId: nft!.id, createdAt: new Date().toISOString() }]
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

  if (nftQuery.isLoading) {
    return (
      <div
        className="mx-auto max-w-[1440px] pb-36 md:px-6 md:py-10 md:pb-10 lg:px-[120px]"
        aria-busy="true"
        aria-label="Carregando detalhe do NFT"
      >
        {/* Mobile: mirrors final chrome to avoid CLS when content arrives */}
        <div className="px-4 pt-3 md:hidden">
          <div className="mb-3 flex items-center justify-between">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          <Skeleton className="aspect-square w-full rounded-[28px]" />
          <div className="space-y-4 pt-6">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="hidden md:block">
          <Skeleton className="mb-8 h-4 w-40" />
          <div className="grid gap-8 lg:grid-cols-[72px_minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
            <div className="hidden flex-col gap-3 lg:flex">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square w-full" />
              ))}
            </div>
            <Skeleton className="aspect-square w-full" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (nftQuery.isError || !nft) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center" role="alert">
        <h1 className="text-2xl font-bold">NFT não encontrado</h1>
        <p className="mt-2 text-muted-foreground">
          O recurso pode ter sido removido ou o link está incorreto.
        </p>
        <Button className="mt-6" asChild>
          <Link to="/">Voltar ao catálogo</Link>
        </Button>
      </div>
    )
  }

  const maxQty = selectedEdition?.available ?? 0
  const unavailable = !selectedEdition || maxQty < 1
  const tokenId = nft.name.match(/#(\d+)/)?.[1] ?? nft.id.replace(/\D/g, '')
  const gallery = nft.gallery.length ? nft.gallery : [nft.imageUrl]
  const mainSrc = gallery[galleryIndex] ?? nft.imageUrl
  const mainImg = nftImageSources(mainSrc)
  const priceLabel = selectedEdition ? formatEth(selectedEdition.priceEth, 2) : '—'

  const editionPills = (
    <div>
      <p className="mb-2.5 text-sm font-semibold text-foreground">Edição:</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Edição">
        {nft.editions.map((ed) => {
          const active = selectedEdition?.id === ed.id
          const soldOut = ed.available < 1
          return (
            <button
              key={ed.id}
              type="button"
              disabled={soldOut}
              aria-pressed={active}
              onClick={() => {
                setEditionId(ed.id)
                setQty(1)
              }}
              className={cn(
                'h-9 min-w-[64px] rounded-full border px-4 text-xs font-semibold tracking-wide uppercase transition',
                active
                  ? 'border-primary text-primary'
                  : 'border-foreground/25 text-foreground/80 hover:border-foreground/50',
                soldOut && 'cursor-not-allowed opacity-40',
              )}
            >
              {ed.label}
            </button>
          )
        })}
      </div>
    </div>
  )

  const metaList = (
    <dl className="space-y-1.5 text-sm text-[#A38E7A]">
      <div>
        <dt className="inline font-medium text-[#A38E7A]">ID do token: </dt>
        <dd className="inline">#{tokenId.padStart(4, '0')}</dd>
      </div>
      <div>
        <dt className="inline font-medium text-[#A38E7A]">Coleção: </dt>
        <dd className="inline">{nft.collection}</dd>
      </div>
      <div>
        <dt className="inline font-medium text-[#A38E7A]">Atributos: </dt>
        <dd className="inline">{nft.tags.join(', ')}</dd>
      </div>
    </dl>
  )

  return (
    <div className="mx-auto max-w-[1440px] pb-36 md:px-6 md:py-8 md:pb-8 lg:px-[120px] lg:py-10">
      {/* Breadcrumb — desktop */}
      <nav className="mb-8 hidden text-sm text-foreground md:block" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link to="/" className="hover:text-primary">
              Início
            </Link>
          </li>
          <li aria-hidden className="text-foreground/40">
            /
          </li>
          <li>
            <a href="/#catalogo" className="hover:text-primary">
              Mercado
            </a>
          </li>
        </ol>
      </nav>

      {/* ——— Mobile layout (Figma) ——— */}
      <div className="md:hidden">
        <div className="px-4 pt-3">
          {/* Nav acima da imagem (Figma) */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#C18E5E]/55 text-[#CFB28C]"
              aria-label="Voltar"
              onClick={() => {
                if (window.history.length > 1) window.history.back()
                else void navigate({ to: '/' })
              }}
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#C18E5E]/55 text-[#CFB28C]"
              aria-label={favorited ? 'Remover dos favoritos' : 'Favoritar'}
              aria-pressed={favorited}
              onClick={() => favMutation.mutate()}
            >
              <Heart
                className={cn('h-4 w-4', favorited && 'fill-primary text-primary')}
                strokeWidth={1.75}
              />
            </button>
          </div>

          <div className="aspect-square overflow-hidden rounded-[28px] bg-[#e8e0d4]">
            <img
              src={mainImg.src}
              srcSet={mainImg.srcSet}
              sizes="(max-width: 767px) 100vw, 520px"
              alt={nft.name}
              className="h-full w-full object-cover"
              width={960}
              height={960}
              fetchPriority="high"
              decoding="async"
            />
          </div>
        </div>

        <div className="space-y-5 px-4 pt-6">
          <div className="flex items-start justify-between gap-3">
            <h1 className="min-w-0 text-[1.35rem] font-bold leading-tight text-foreground">
              {nft.name}
            </h1>
            <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border border-[#C18E5E]/80 px-2.5 py-1 text-[11px]">
              <Star className="h-3 w-3 fill-primary text-primary" strokeWidth={0} />
              <span className="font-semibold text-foreground">{rating}</span>
              <span className="text-[#A38E7A]">({reviewCount})</span>
            </span>
          </div>

          <p className="text-sm leading-6 text-[#A38E7A]">{nft.description}</p>

          {editionPills}
          {metaList}
        </div>

        {/* Sticky purchase sheet (Figma) */}
        <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
          <div className="rounded-t-[22px] bg-[#24160f] px-4 pt-4 pb-3 shadow-[0_-12px_40px_rgba(0,0,0,0.55)]">
            <div className="mb-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-sm text-foreground">Qtd.</span>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#C18E5E]/35 text-[#CFB28C] disabled:opacity-40"
                  aria-label="Diminuir quantidade"
                  disabled={unavailable || qty <= 1}
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                >
                  <Minus className="h-3.5 w-3.5" strokeWidth={2.25} />
                </button>
                <span className="min-w-[1.25rem] text-center text-sm font-medium tabular-nums text-foreground">
                  {qty}
                </span>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#C18E5E]/35 text-[#CFB28C] disabled:opacity-40"
                  aria-label="Aumentar quantidade"
                  disabled={unavailable || qty >= maxQty}
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
                </button>
              </div>
              <p className="text-xl font-bold text-primary tabular-nums">{priceLabel} ETH</p>
            </div>
            <div className="flex items-center gap-2.5">
              <Button
                size="lg"
                className="h-12 flex-1 rounded-full bg-primary text-base font-bold text-primary-foreground hover:bg-primary/90"
                disabled={unavailable || addCart.isPending}
                onClick={() => addCart.mutate()}
              >
                {addCart.isPending ? '…' : 'Comprar NFT'}
              </Button>
              <Link
                to="/cart"
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1a1410] text-[#CFB28C] ring-1 ring-[#CFB28C]/35"
                aria-label={`Carrinho com ${cartCount} itens`}
              >
                <ShoppingCart className="h-5 w-5" strokeWidth={1.75} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ——— Desktop layout ——— */}
      <div className="hidden md:block">
        <div className="grid gap-8 lg:grid-cols-[72px_minmax(0,520px)_minmax(0,1fr)] lg:items-start lg:gap-8 xl:gap-10">
          <div className="hidden flex-col gap-3 lg:flex" role="tablist" aria-label="Galeria">
            {gallery.map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                role="tab"
                aria-selected={i === galleryIndex}
                aria-label={`Imagem ${i + 1}`}
                className={cn(
                  'aspect-square overflow-hidden rounded-[8px] border-2 transition',
                  i === galleryIndex
                    ? 'border-primary'
                    : 'border-transparent opacity-80 hover:opacity-100',
                )}
                onClick={() => setGalleryIndex(i)}
              >
                <img
                  src={nftImageSources(src).src}
                  srcSet={nftImageSources(src).srcSet}
                  sizes="72px"
                  alt=""
                  width={144}
                  height={144}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>

          <div className="relative mx-auto w-full max-w-[520px] lg:mx-0">
            <div className="relative aspect-square overflow-hidden rounded-[12px] bg-[#1a1410]">
              <img
                src={mainImg.src}
                srcSet={mainImg.srcSet}
                sizes="520px"
                alt={nft.name}
                className="h-full w-full object-cover"
                width={960}
                height={960}
                fetchPriority="high"
                decoding="async"
              />
              <span
                className="absolute top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-foreground"
                aria-hidden
              >
                <Search className="h-4 w-4" strokeWidth={1.75} />
              </span>
            </div>
          </div>

          <div className="min-w-0 space-y-5">
            <div>
              <h1 className="text-[28px] leading-tight font-bold tracking-tight text-foreground sm:text-[32px]">
                {nft.name}
              </h1>
              <p className="mt-2 text-2xl font-bold text-primary sm:text-[28px]">
                {priceLabel} ETH
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-0.5" aria-label="5 de 5 estrelas">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-text-accent text-text-accent"
                      strokeWidth={0}
                    />
                  ))}
                </div>
                <span className="text-sm text-text-secondary">
                  {reviewCount} avaliações de colecionadores
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-foreground">Sobre este NFT:</p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{nft.description}</p>
            </div>

            {editionPills}

            <div className="flex items-center gap-3">
              <div className="inline-flex h-11 items-stretch overflow-hidden rounded-[8px] border border-foreground/20">
                <button
                  type="button"
                  className="flex w-11 items-center justify-center text-foreground hover:bg-white/5 disabled:opacity-40"
                  aria-label="Diminuir quantidade"
                  disabled={unavailable || qty <= 1}
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="flex min-w-[2.5rem] items-center justify-center border-x border-foreground/20 text-sm font-medium tabular-nums">
                  {qty}
                </span>
                <button
                  type="button"
                  className="flex w-11 items-center justify-center text-foreground hover:bg-white/5 disabled:opacity-40"
                  aria-label="Aumentar quantidade"
                  disabled={unavailable || qty >= maxQty}
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {unavailable ? <p className="text-sm text-destructive">Edição indisponível</p> : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                className="min-w-[160px] px-8 font-bold uppercase"
                disabled={unavailable || addCart.isPending}
                onClick={() => addCart.mutate()}
              >
                {addCart.isPending ? '…' : 'Comprar'}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-foreground/25 text-foreground hover:bg-white/5"
                aria-pressed={favorited}
                onClick={() => favMutation.mutate()}
              >
                <Heart
                  className={cn('h-4 w-4', favorited && 'fill-primary text-primary')}
                  strokeWidth={1.75}
                />
                Favoritar
              </Button>
            </div>

            <dl className="space-y-1.5 text-sm text-text-secondary">
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-foreground/70">ID do token</dt>
                <dd>#{tokenId.padStart(4, '0')}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-foreground/70">Coleção</dt>
                <dd>{nft.collection}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-foreground/70">Atributos</dt>
                <dd>{nft.tags.join(', ')}</dd>
              </div>
            </dl>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <span className="text-sm text-text-secondary">Compartilhar este NFT:</span>
              <div className="flex items-center gap-2">
                <ShareIconButton
                  label="LinkedIn"
                  onClick={() => toast.message('Compartilhar no LinkedIn em breve')}
                >
                  <LinkedInGlyph />
                </ShareIconButton>
                <ShareIconButton
                  label="E-mail"
                  onClick={() => {
                    window.location.href = `mailto:?subject=${encodeURIComponent(nft.name)}&body=${encodeURIComponent(window.location.href)}`
                  }}
                >
                  <Mail className="h-4 w-4" strokeWidth={1.75} />
                </ShareIconButton>
                <ShareIconButton
                  label="Twitter"
                  onClick={() => toast.message('Compartilhar no X em breve')}
                >
                  <XGlyph />
                </ShareIconButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + related — both viewports, below fold on mobile */}
      <div className="mt-10 px-4 md:mt-14 md:px-0">
        <div className="border-b border-foreground/15">
          <div className="flex flex-wrap gap-8" role="tablist" aria-label="Conteúdo do NFT">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'details'}
              className={cn(
                'pb-3 text-sm font-medium transition-colors',
                tab === 'details'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-foreground/70 hover:text-foreground',
              )}
              onClick={() => setTab('details')}
            >
              Detalhes do NFT
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'reviews'}
              className={cn(
                'pb-3 text-sm font-medium transition-colors',
                tab === 'reviews'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-foreground/70 hover:text-foreground',
              )}
              onClick={() => setTab('reviews')}
            >
              Avaliações de colecionadores ({reviewCount})
            </button>
          </div>
        </div>

        <div className="mt-6 max-w-3xl space-y-4 text-sm leading-7 text-text-secondary">
          {tab === 'details' ? (
            <>
              <p>
                {nft.name} é uma obra autenticada na rede {nft.network}, criada por {nft.creator} e
                publicada na coleção {nft.collection}. A peça combina identidade visual curada com
                metadados permanentes, pensada para colecionadores que valorizam raridade e
                proveniência verificável.
              </p>
              <p>
                A arte é entregue em alta resolução com registro on-chain. Em vendas secundárias, o
                criador recebe royalty de 5%. O arquivo mestre e os metadados residem em IPFS, com
                espelhamento no contrato inteligente ERC-721 verificado.
              </p>
              <p>
                Direitos autorais: 0x7A42…1D68 — Contrato inteligente ERC-721 verificado. Rede:{' '}
                {nft.network}.
              </p>
            </>
          ) : (
            <div className="space-y-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <article key={i} className="border-b border-foreground/10 pb-5">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((__, s) => (
                        <Star
                          key={s}
                          className="h-3.5 w-3.5 fill-text-accent text-text-accent"
                          strokeWidth={0}
                        />
                      ))}
                    </div>
                    <span className="text-foreground">
                      Colecionador {String.fromCharCode(65 + i)}
                    </span>
                  </div>
                  <p>
                    Peça com ótima presença na carteira. A edição{' '}
                    {selectedEdition?.label ?? nft.editions[0]?.label} chegou rápido e os metadados
                    bateram com o prometido no listagem.
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>

        <section className="mt-16 mb-8">
          <div className="mb-6 flex items-end gap-4">
            <h2 className="shrink-0 text-lg font-bold text-primary">Mais desta coleção</h2>
            <div className="mb-1.5 h-px flex-1 bg-foreground/15" />
          </div>
          {relatedQuery.isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-square w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
            </div>
          ) : relatedSlice.length ? (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 md:gap-5">
                {relatedSlice.map((item) => (
                  <NftCard key={item.id} nft={item} />
                ))}
              </div>
              {relatedPages > 1 ? (
                <nav className="mt-8 flex justify-center gap-1" aria-label="Páginas da coleção">
                  {Array.from({ length: Math.min(relatedPages, 3) }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Página ${i + 1}`}
                      aria-current={relatedPage === i ? 'page' : undefined}
                      className="flex h-6 w-6 items-center justify-center"
                      onClick={() => setRelatedPage(i)}
                    >
                      <span
                        className={cn(
                          'h-2.5 w-2.5 rounded-full transition',
                          relatedPage === i ? 'bg-primary' : 'bg-[#5c4030]',
                        )}
                        aria-hidden
                      />
                    </button>
                  ))}
                </nav>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-text-secondary">Nenhum outro item nesta coleção.</p>
          )}
        </section>
      </div>
    </div>
  )
}

function ShareIconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] border border-text-accent text-text-accent transition hover:bg-text-accent/10"
    >
      {children}
    </button>
  )
}

function LinkedInGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M6.5 9.5H3.8V20h2.7V9.5zM5.15 4A1.75 1.75 0 1 0 5.16 7.5 1.75 1.75 0 0 0 5.15 4zM20.2 20h-2.7v-5.3c0-1.5-.5-2.5-1.8-2.5-1 0-1.5.7-1.8 1.3-.1.2-.1.5-.1.8V20h-2.7s.05-9.2 0-10.2h2.7v1.4c.4-.6 1.1-1.6 2.7-1.6 2 0 3.5 1.3 3.5 4.1V20z" />
    </svg>
  )
}

function XGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M18.2 3H21l-6.5 7.4L22 21h-5.6l-4.4-5.7L7 21H4.2l7-8L2 3h5.7l4 5.2L18.2 3zm-1 16.2h1.6L7 4.7H5.3l11.9 14.5z" />
    </svg>
  )
}
