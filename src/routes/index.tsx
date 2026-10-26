import { createFileRoute, Link, stripSearchParams, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { endpoints } from '@/shared/api/endpoints'
import { NftCard, NftGridSkeleton } from '@/features/catalog/components'
import { CatalogFilters, PRICE_MAX, PRICE_MIN } from '@/features/catalog/catalog-filters'
import { MobileHomeChrome } from '@/features/catalog/mobile-home-chrome'
import { SortSelect } from '@/features/catalog/sort-select'
import { Button } from '@/shared/ui/button'
import { nftImageSources } from '@/shared/lib/nft-image'
import { cn } from '@/shared/lib/utils'

type CatalogSearch = {
  q?: string; collection?: string; network?: string; minPrice?: string; maxPrice?: string
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'oldest'; page?: number; tab?: 'all' | 'new' | 'hot'
}
// URL parsing stays on the initial route path; form schemas load with their feature.
function parseCatalogSearch(input: Record<string, unknown>): CatalogSearch {
  const text = (value: unknown) => typeof value === 'string' ? value : undefined
  const page = Number(input.page)
  return {
    q: text(input.q), collection: text(input.collection), network: text(input.network),
    minPrice: text(input.minPrice), maxPrice: text(input.maxPrice),
    sort: ['price_asc', 'price_desc', 'newest', 'oldest'].includes(String(input.sort)) ? input.sort as CatalogSearch['sort'] : 'newest',
    page: Number.isInteger(page) && page > 0 ? page : 1,
    tab: ['all', 'new', 'hot'].includes(String(input.tab)) ? input.tab as CatalogSearch['tab'] : 'all',
  }
}

export const Route = createFileRoute('/')({
  validateSearch: parseCatalogSearch,
  search: {
    middlewares: [stripSearchParams({ sort: 'newest', page: 1, tab: 'all' })],
  },
  component: HomePage,
})

/** Slides do carrossel do hero (Figma: 3 indicadores). */
const HERO_SLIDES = [
  { image: '/nfts/emerald-ape.webp', label: 'Emerald Ape' },
  { image: '/nfts/ivory-baron.webp', label: 'Ivory Baron' },
  { image: '/nfts/violet-nomad.webp', label: 'Violet Nomad' },
] as const

const BLOG_POSTS = [
  {
    image: '/nfts/ivory-baron.webp',
    meta: '12 de setembro  |  Leitura de 6 min',
    title: 'Como funciona a propriedade de NFTs',
    excerpt: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
  },
  {
    image: '/nfts/emerald-ape.webp',
    meta: '13 de setembro  |  Leitura de 2 min',
    title: '10 artistas digitais para acompanhar',
    excerpt: 'Conheça criadores que moldam a cultura digital.',
  },
  {
    image: '/nfts/violet-nomad.webp',
    meta: '15 de setembro  |  Leitura de 3 min',
    title: 'Raridade, atributos e procedência',
    excerpt: 'Entenda raridade, procedência, direitos autorais e utilidade.',
  },
  {
    image: '/nfts/cosmic-bloom.webp',
    meta: '15 de setembro  |  Leitura de 2 min',
    title: 'Como proteger sua carteira',
    excerpt: 'Proteja sua carteira, seus ativos e sua identidade.',
  },
] as const

function HomePage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/' })
  const [minDraft, setMinDraft] = useState(search.minPrice ?? String(PRICE_MIN))
  const [maxDraft, setMaxDraft] = useState(search.maxPrice ?? String(PRICE_MAX))
  const [heroIndex, setHeroIndex] = useState(0)
  const [heroPaused, setHeroPaused] = useState(false)

  const sort =
    search.tab === 'hot' ? 'price_desc' : search.tab === 'new' ? 'newest' : (search.sort ?? 'newest')

  const query = useQuery({
    queryKey: ['nfts', { ...search, sort, pageSize: 9 }],
    queryFn: ({ signal }) =>
      endpoints.listNfts({
        q: search.q,
        collection: search.collection,
        network: search.network,
        minPrice: search.minPrice,
        maxPrice: search.maxPrice,
        sort,
        page: search.page ?? 1,
        pageSize: 9,
      }, signal),
  })

  const countsQuery = useQuery({
    queryKey: ['nfts', 'meta'],
    queryFn: ({ signal }) => endpoints.catalogMeta(signal),
  })

  const catalogItems = countsQuery.data?.featured ?? []
  const collectionCounts = useMemo(() => new Map(Object.entries(countsQuery.data?.collections ?? {})), [countsQuery.data])
  const networkCounts = useMemo(() => new Map(Object.entries(countsQuery.data?.networks ?? {})), [countsQuery.data])

  const featuredSidebar =
    catalogItems.find((n) => n.imageUrl.includes('violet-nomad')) ?? catalogItems[1]

  const heroSlide = HERO_SLIDES[heroIndex] ?? HERO_SLIDES[0]!
  const nextHero = HERO_SLIDES[(heroIndex + 1) % HERO_SLIDES.length]!
  const heroImg = nftImageSources(heroSlide.image)
  const nextHeroImg = nftImageSources(nextHero.image)
  const heroNft =
    countsQuery.data?.featured.find((n) => n.imageUrl === heroSlide.image) ??
    countsQuery.data?.featured[0]

  useEffect(() => {
    if (heroPaused) return
    const id = window.setInterval(() => {
      setHeroIndex((i) => (i + 1) % HERO_SLIDES.length)
    }, 5000)
    return () => window.clearInterval(id)
  }, [heroPaused])

  const updateSearch = (patch: Partial<typeof search>) => {
    void navigate({
      resetScroll: false,
      search: (prev) => {
        const next = { ...prev, ...patch }
        if (
          'collection' in patch ||
          'network' in patch ||
          'q' in patch ||
          'sort' in patch ||
          'minPrice' in patch ||
          'maxPrice' in patch ||
          'tab' in patch
        ) {
          if (!('page' in patch)) next.page = 1
        }
        return next
      },
    })
  }

  const totalPages = query.data?.totalPages ?? 1
  const currentPage = query.data?.page ?? 1

  return (
    <div className="bg-background pb-24 md:pb-0">
      <MobileHomeChrome
        q={search.q}
        search={search}
        collectionCounts={collectionCounts}
        networkCounts={networkCounts}
        minDraft={minDraft}
        maxDraft={maxDraft}
        setMinDraft={setMinDraft}
        setMaxDraft={setMaxDraft}
        onUpdate={updateSearch}
        featured={featuredSidebar}
      />

      {/* Hero mobile — card Figma (quadrados arredondados + elipses) */}
      <section
        className="px-4 pb-2 md:hidden"
        onMouseEnter={() => setHeroPaused(true)}
        onMouseLeave={() => setHeroPaused(false)}
      >
        <div className="relative overflow-hidden rounded-[28px] bg-[#24160f] px-4 pb-5 pt-5">
          {/* Elipses decorativas (Figma) */}
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute left-[-18%] top-[-35%] h-[140%] w-[70%] rounded-full bg-[#3a2a20]/55" />
            <div className="absolute left-[8%] top-[-20%] h-[120%] w-[55%] rounded-full bg-[#4a3428]/35" />
          </div>

          <div className="relative grid grid-cols-[1fr_1fr] items-center gap-1">
            <div className="min-w-0">
              <p className="text-[11px] leading-none text-white">Bem-vindo à Kurio</p>
              <h1 className="mt-2 text-[clamp(1.1rem,4.8vw,1.4rem)] font-bold uppercase leading-[1.12] tracking-wide text-white">
                Seja dono da
                <br />
                cultura digital
              </h1>
              <p className="mt-2 max-w-[12rem] text-[10px] leading-[1.5] text-[#CFB28C]">
                Descubra NFTs selecionados de criadores do mundo todo.
              </p>
              <button
                type="button"
                className="mt-3.5 inline-flex items-center gap-1 text-[11px] font-bold tracking-wide text-primary uppercase"
                onClick={() =>
                  document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                Explorar <span aria-hidden>→</span>
              </button>
            </div>

            <div className="relative ml-auto aspect-square w-[92%] max-w-[160px]">
              <img
                key={heroSlide.image}
                src={heroImg.src}
                srcSet={heroImg.srcSet}
                sizes="160px"
                alt={heroNft?.name ?? heroSlide.label}
                width={640}
                height={640}
                fetchPriority="high"
                decoding="async"
                className="absolute inset-0 h-full w-full rounded-[20px] object-cover"
              />
              <img
                src={nextHeroImg.src}
                srcSet={nextHeroImg.srcSet}
                sizes="80px"
                alt=""
                width={320}
                height={320}
                loading="lazy"
                decoding="async"
                className="absolute bottom-[-6%] left-[-18%] h-[46%] w-[46%] rounded-[14px] object-cover shadow-[0_8px_20px_rgba(0,0,0,0.5)] ring-[3px] ring-[#24160f]"
              />
            </div>
          </div>

          <div
            className="relative z-[1] mt-4 flex justify-center gap-1.5"
            role="tablist"
            aria-label="Destaques do hero"
          >
            {HERO_SLIDES.map((slide, index) => {
              const active = heroIndex === index
              return (
                <button
                  key={slide.image}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={`Slide ${index + 1}: ${slide.label}`}
                  className="flex h-6 w-6 items-center justify-center"
                  onClick={() => {
                    setHeroIndex(index)
                    setHeroPaused(true)
                  }}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full transition-colors',
                      active ? 'bg-primary' : 'bg-[#5c4638]',
                    )}
                    aria-hidden
                  />
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Hero desktop */}
      <section
        className="relative hidden bg-background md:block"
        onMouseEnter={() => setHeroPaused(true)}
        onMouseLeave={() => setHeroPaused(false)}
      >
        <div className="mx-auto grid max-w-[1440px] items-center gap-10 px-6 pb-14 pt-10 lg:grid-cols-2 lg:gap-16 lg:px-[120px] lg:pb-16 lg:pt-14">
          <div className="flex max-w-[560px] flex-col gap-5">
            <p className="text-[13px] text-foreground/70">Bem-vindo à Kurio</p>
            <h1 className="text-[clamp(2rem,4.2vw,2.7rem)] font-bold uppercase leading-[1.15] tracking-normal text-foreground">
              Seja dono do futuro
              <br />
              da arte digital
            </h1>
            <p className="max-w-[520px] text-sm leading-6 text-[#CFB28C]">
              Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte
              digital rara, apoie artistas e tenha uma parte da cultura da internet.
            </p>
            <div>
              <Button
                size="lg"
                className="uppercase"
                onClick={() =>
                  document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                Explorar
              </Button>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[480px] lg:ml-auto lg:max-w-[520px]">
            {heroNft ? (
              <Link
                to="/nfts/$id"
                params={{ id: heroNft.id }}
                className="block overflow-hidden rounded-[24px] bg-[#1a1410] outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Ver ${heroNft.name}`}
              >
                <img
                  key={heroSlide.image}
                  src={heroImg.src}
                  srcSet={heroImg.srcSet}
                  sizes="(min-width: 1024px) 520px, (min-width: 768px) 480px, 100vw"
                  alt={heroNft.name}
                  width={960}
                  height={960}
                  fetchPriority="high"
                  decoding="async"
                  className="aspect-square w-full object-cover transition-opacity duration-500"
                />
              </Link>
            ) : (
              <div className="overflow-hidden rounded-[24px] bg-[#1a1410]">
                <img
                  key={heroSlide.image}
                  src={heroImg.src}
                  srcSet={heroImg.srcSet}
                  sizes="(min-width: 1024px) 520px, (min-width: 768px) 480px, 100vw"
                  alt={heroSlide.label}
                  width={960}
                  height={960}
                  fetchPriority="high"
                  decoding="async"
                  className="aspect-square w-full object-cover"
                />
              </div>
            )}
          </div>
        </div>

        <div
          className="flex justify-center gap-2 pb-10"
          role="tablist"
          aria-label="Destaques do hero"
        >
          {HERO_SLIDES.map((slide, index) => {
            const active = heroIndex === index
            return (
              <button
                key={slide.image}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`Slide ${index + 1}: ${slide.label}`}
                className="flex h-6 min-w-6 items-center justify-center px-0.5"
                onClick={() => {
                  setHeroIndex(index)
                  setHeroPaused(true)
                }}
              >
                <span
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    active ? 'w-6 bg-primary' : 'w-1.5 bg-white/25',
                  )}
                  aria-hidden
                />
              </button>
            )
          })}
        </div>
      </section>

      {/* Marketplace */}
      <section
        id="catalogo"
        className="mx-auto max-w-[1440px] scroll-mt-24 px-4 py-8 md:px-6 md:py-12 lg:px-[120px] lg:py-16"
      >
        <div className="grid gap-10 md:grid-cols-[200px_1fr] md:gap-10 lg:grid-cols-[220px_1fr] lg:gap-14">
          <aside className="hidden space-y-8 md:block">
            <CatalogFilters
              search={search}
              collectionCounts={collectionCounts}
              networkCounts={networkCounts}
              minDraft={minDraft}
              maxDraft={maxDraft}
              setMinDraft={setMinDraft}
              setMaxDraft={setMaxDraft}
              onUpdate={updateSearch}
              featured={featuredSidebar}
            />
          </aside>

          <div className="space-y-6">
            <h2 className="sr-only">Catálogo de NFTs</h2>
            {search.q ? (
              <p className="text-sm text-text-secondary">
                Resultados para{' '}
                <span className="font-medium text-foreground">“{search.q}”</span>
              </p>
            ) : null}

            <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-5 text-sm md:gap-6">
                {(
                  [
                    ['all', 'Todos os NFTs'],
                    ['new', 'Novos lançamentos'],
                    ['hot', 'Em alta'],
                  ] as const
                ).map(([tab, label]) => (
                  <button
                    key={tab}
                    type="button"
                    className={cn(
                      'pb-1 font-medium text-[#CFB28C] transition hover:text-foreground',
                      (search.tab ?? 'all') === tab &&
                        'text-primary underline decoration-primary decoration-2 underline-offset-8',
                    )}
                    onClick={() => updateSearch({ tab })}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="hidden md:block">
                <SortSelect
                  value={search.sort ?? 'newest'}
                  onChange={(sortValue) => updateSearch({ sort: sortValue, tab: 'all' })}
                />
              </div>
            </div>

            {query.isLoading ? <NftGridSkeleton /> : null}
            {query.isError ? (
              <div
                role="alert"
                className="rounded-lg border border-destructive/40 bg-destructive/10 p-4"
              >
                <p>Falha ao carregar o catálogo.</p>
                <Button className="mt-3" variant="outline" onClick={() => void query.refetch()}>
                  Tentar novamente
                </Button>
              </div>
            ) : null}
            {query.data && query.data.items.length === 0 ? (
              <p className="py-16 text-center text-muted-foreground">
                Nenhum NFT encontrado com esses filtros.
              </p>
            ) : null}
            {query.data && query.data.items.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
                  {query.data.items.map((nft, index) => (
                    <NftCard key={nft.id} nft={nft} priority={index < 2} />
                  ))}
                </div>
                <nav
                  className="flex items-center justify-center gap-1.5 pt-6 sm:justify-end"
                  aria-label="Paginação"
                >
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const windowStart = Math.min(
                      Math.max(1, currentPage - 2),
                      Math.max(1, totalPages - 4),
                    )
                    const p = windowStart + i
                    if (p > totalPages) return null
                    const active = currentPage === p
                    return (
                      <button
                        key={p}
                        type="button"
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-[4px] text-sm transition',
                          active
                            ? 'bg-primary font-medium text-primary-foreground'
                            : 'border border-white/25 text-foreground hover:border-primary/70',
                        )}
                        onClick={() => updateSearch({ page: p })}
                      >
                        {p}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-white/25 text-sm text-foreground hover:border-primary/70 disabled:opacity-40"
                    disabled={currentPage >= totalPages}
                    onClick={() => updateSearch({ page: Math.min(currentPage + 1, totalPages) })}
                    aria-label="Próxima página"
                  >
                    ›
                  </button>
                </nav>
              </>
            ) : null}
          </div>
        </div>
      </section>

      <section id="promos" className="bg-background">
        <div className="mx-auto grid max-w-[1440px] gap-5 px-6 py-12 sm:grid-cols-2 lg:gap-6 lg:px-[120px]">
          {[
            {
              image: '/nfts/emerald-ape.webp',
              title: 'Lançamentos gênesis de edição limitada',
              body: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
            },
            {
              image: '/nfts/ivory-baron.webp',
              title: 'Arte digital selecionada e muito mais',
              body: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
            },
          ].map((promo) => {
            const img = nftImageSources(promo.image)
            return (
              <div
                key={promo.title}
                className="grid min-h-[220px] overflow-hidden rounded-2xl bg-[#1a110d] sm:grid-cols-2"
              >
                <div className="min-h-[200px] overflow-hidden bg-[#e8e0d4] sm:rounded-l-2xl">
                  <img
                    src={img.src}
                    srcSet={img.srcSet}
                    sizes="(min-width: 640px) 50vw, 100vw"
                    alt=""
                    width={640}
                    height={640}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-col items-end justify-center gap-4 p-6 text-right sm:p-8">
                  <h2 className="max-w-[280px] text-lg font-semibold leading-snug text-foreground sm:text-xl">
                    {promo.title}
                  </h2>
                  <p className="max-w-[280px] text-sm leading-6 text-[#CFB28C]">{promo.body}</p>
                  <Button
                    size="sm"
                    className="mt-1"
                    onClick={() =>
                      document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })
                    }
                  >
                    Explorar →
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section id="diario" className="bg-background">
        <div className="mx-auto max-w-[1440px] px-6 py-14 lg:px-[120px] lg:py-20">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Diário da Cunhagem</h2>
            <p className="mt-4 text-sm leading-6 text-[#CFB28C] sm:text-base">
              Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {BLOG_POSTS.map((post) => {
              const img = nftImageSources(post.image)
              return (
                <article
                  key={post.title}
                  className="flex flex-col overflow-hidden rounded-2xl bg-[#1a110d]"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-[#e8e0d4]">
                    <img
                      src={img.src}
                      srcSet={img.srcSet}
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      alt=""
                      width={640}
                      height={480}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <p className="text-[11px] leading-4 text-[#CFB28C]">{post.meta}</p>
                    <h3 className="text-base font-bold leading-snug text-foreground">{post.title}</h3>
                    <p className="text-sm leading-6 text-[#CFB28C]">{post.excerpt}</p>
                    <span className="mt-auto pt-2 text-sm text-primary">Ler mais →</span>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
