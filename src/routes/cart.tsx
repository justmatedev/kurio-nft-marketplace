import { useSessionGuard } from '@/features/auth/session-guard'
import { QueryRefresh, QueryError } from '@/shared/ui/query-state'
import { useOwnerId } from '@/shared/api/query-keys'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Minus, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { NftCard } from '@/features/catalog/components'
import { endpoints } from '@/shared/api/endpoints'
import { getApiError } from '@/shared/api/client'
import type { CartItem, Quote } from '@/shared/api/types'
import { formatEth, mulEth } from '@/shared/lib/eth'
import { cn } from '@/shared/lib/utils'
import { Skeleton } from '@/shared/ui/skeleton'

export const Route = createFileRoute('/cart')({
  component: CartPage,
})

function CartPage() {
  const ownerId = useOwnerId()
  const isCurrentSession = useSessionGuard()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [couponDraft, setCouponDraft] = useState<string | null>(null)
  const [recoPage, setRecoPage] = useState(0)

  const cartQuery = useQuery({ queryKey: ['cart', ownerId], queryFn: ({ signal }) => endpoints.cart(signal) })
  const coupon = couponDraft ?? cartQuery.data?.couponCode ?? ''
  const quoteQuery = useQuery({
    queryKey: ['quote', ownerId, cartQuery.data?.couponCode, cartQuery.data?.updatedAt],
    queryFn: ({ signal }) => endpoints.quote(cartQuery.data?.couponCode ?? null, undefined, undefined, signal),
    enabled: Boolean(cartQuery.data),
  })
  const catalogQuery = useQuery({
    queryKey: ['nfts', 'cart-reco'],
    queryFn: ({ signal }) => endpoints.listNfts({ page: 1, pageSize: 12, sort: 'newest' }, signal),
  })

  const cartNftIds = useMemo(
    () => new Set(cartQuery.data?.items.map((i) => i.nftId) ?? []),
    [cartQuery.data?.items],
  )

  const recommendations = useMemo(() => {
    const items = catalogQuery.data?.items.filter((n) => !cartNftIds.has(n.id)) ?? []
    return items.length ? items : (catalogQuery.data?.items ?? [])
  }, [catalogQuery.data?.items, cartNftIds])

  const recoPageSize = 5
  const recoPages = Math.max(1, Math.ceil(recommendations.length / recoPageSize))
  const recoSlice = recommendations.slice(
    recoPage * recoPageSize,
    recoPage * recoPageSize + recoPageSize,
  )

  const updateItem = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      endpoints.updateCartItem(id, quantity),
    onSuccess: () => {
      if (!isCurrentSession()) return
      void queryClient.invalidateQueries({ queryKey: ['cart', ownerId] })
      void queryClient.invalidateQueries({ queryKey: ['quote'] })
    },
    onError: (e) => { if (isCurrentSession()) toast.error(getApiError(e).message) },
  })

  const removeItem = useMutation({
    mutationFn: (id: string) => endpoints.removeCartItem(id),
    onSuccess: () => {
      if (!isCurrentSession()) return
      void queryClient.invalidateQueries({ queryKey: ['cart', ownerId] })
      void queryClient.invalidateQueries({ queryKey: ['quote'] })
      toast.message('Item removido')
    },
    onError: e => { if (isCurrentSession()) toast.error(getApiError(e).message) },
  })

  const applyCoupon = useMutation({
    mutationFn: (code: string | null) => endpoints.quote(code),
    onSuccess: (quote) => {
      if (!isCurrentSession()) return
      void queryClient.setQueryData(['quote', ownerId, quote.couponCode, cartQuery.data?.updatedAt], quote)
      void queryClient.invalidateQueries({ queryKey: ['cart', ownerId] })
      toast.success(quote.couponCode ? `Cupom ${quote.couponCode} aplicado` : 'Cupom removido')
    },
    onError: (e) => { if (isCurrentSession()) toast.error(getApiError(e).message) },
  })

  const cart = cartQuery.data
  const quote = quoteQuery.data
  const hasItems = Boolean(cart?.items.length)
  const busy = updateItem.isPending || removeItem.isPending

  if (cartQuery.isLoading) {
    return (
      <div
        className="mx-auto max-w-[1440px] space-y-8 px-6 py-10 lg:px-[120px]"
        aria-busy="true"
        aria-label="Carregando carrinho"
      >
        <Skeleton className="h-4 w-48" />
        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-80 w-full" aria-label="Carregando resumo do carrinho" />
        </div>
      </div>
    )
  }

  if (cartQuery.isError && !cartQuery.data) return <QueryError error={cartQuery.error ?? quoteQuery.error} retry={() => { void cartQuery.refetch(); void quoteQuery.refetch() }} />

  const itemRows =
    cart?.items.map((item) => ({
      item,
      lineTotal:
        quote?.items.find((q) => q.cartItemId === item.id)?.lineTotalEth ??
        mulEth(item.unitPriceEth, item.quantity),
    })) ?? []

  return (
    <div className="mx-auto max-w-[1440px] pb-[22rem] md:px-6 md:py-8 md:pb-8 lg:px-[120px] lg:py-10">
      <QueryRefresh fetching={cartQuery.isFetching || quoteQuery.isFetching} error={cartQuery.error ?? quoteQuery.error} retry={() => { void cartQuery.refetch(); void quoteQuery.refetch() }} />
      {/* ——— Mobile header (Figma) ——— */}
      <header className="relative mb-4 flex items-center justify-center px-4 pt-3 md:hidden">
        <button
          type="button"
          className="absolute left-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#24160f] text-[#CFB28C]"
          aria-label="Voltar"
          onClick={() => {
            if (window.history.length > 1) window.history.back()
            else void navigate({ to: '/' })
          }}
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <h1 className="text-base font-medium text-foreground">Carrinho de NFTs</h1>
      </header>

      {/* Breadcrumb — desktop */}
      <nav aria-label="Breadcrumb" className="mb-8 hidden text-sm text-white/80 md:block">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link to="/" className="hover:text-white">
              Início
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <a href="/#catalogo" className="hover:text-white">
              Mercado
            </a>
          </li>
          <li aria-hidden>/</li>
          <li className="text-white" aria-current="page">
            Carrinho
          </li>
        </ol>
      </nav>

      <div className="grid items-start gap-8 md:gap-10 lg:grid-cols-[minmax(0,1fr)_360px] xl:gap-14">
        <section aria-label="Itens do carrinho" className="px-4 md:px-0">
          {!hasItems ? (
            <p className="text-text-secondary">
              Seu carrinho está vazio.{' '}
              <Link to="/" className="text-primary underline underline-offset-4">
                Continuar explorando
              </Link>
            </p>
          ) : (
            <>
              <div
                className="mb-3 hidden grid-cols-[minmax(0,1.6fr)_0.7fr_0.9fr_0.7fr_40px] gap-4 border-b border-white/10 pb-3 text-xs tracking-wide text-white/50 md:grid"
                aria-hidden
              >
                <span>NFTs</span>
                <span className="text-right">Preço</span>
                <span className="text-center">Edições</span>
                <span className="text-right">Total</span>
                <span />
              </div>

              {/* Mobile cards */}
              <ul className="space-y-3 md:hidden">
                {itemRows.map(({ item, lineTotal }) => (
                  <MobileCartCard
                    key={item.id}
                    item={item}
                    lineTotal={lineTotal}
                    busy={busy}
                    onQty={(quantity) => updateItem.mutate({ id: item.id, quantity })}
                    onRemove={() => removeItem.mutate(item.id)}
                  />
                ))}
              </ul>

              {/* Desktop rows */}
              <ul className="hidden divide-y divide-white/10 md:block">
                {itemRows.map(({ item, lineTotal }) => (
                  <DesktopCartRow
                    key={item.id}
                    item={item}
                    lineTotal={lineTotal}
                    busy={busy}
                    onQty={(quantity) => updateItem.mutate({ id: item.id, quantity })}
                    onRemove={() => removeItem.mutate(item.id)}
                  />
                ))}
              </ul>
            </>
          )}
        </section>

        {/* Summary — mobile sheet + desktop aside */}
        <CartSummary
          coupon={coupon}
          setCouponDraft={setCouponDraft}
          quote={quote}
          quoteLoading={quoteQuery.isLoading}
          applyPending={applyCoupon.isPending}
          onApply={() => applyCoupon.mutate(coupon.trim() || null)}
          onRemoveCoupon={() => {
            setCouponDraft('')
            applyCoupon.mutate(null)
          }}
          hasItems={hasItems}
        />
      </div>

      <section
        className="mt-12 hidden px-4 md:mt-16 md:block md:px-0 lg:mt-20"
        aria-labelledby="cart-reco-heading"
      >
        <h2 id="cart-reco-heading" className="mb-6 text-xl font-bold text-foreground sm:text-2xl">
          Colecionadores também viram
        </h2>
        {catalogQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5" aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square w-full rounded-2xl" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {recoSlice.map((nft) => (
                <NftCard key={nft.id} nft={nft} />
              ))}
            </div>
            {recoPages > 1 ? (
              <div
                className="mt-8 flex justify-center gap-2"
                role="tablist"
                aria-label="Páginas de recomendações"
              >
                {Array.from({ length: recoPages }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={i === recoPage}
                    aria-label={`Página ${i + 1}`}
                    className={cn(
                      'h-2.5 w-2.5 rounded-full transition',
                      i === recoPage ? 'bg-primary' : 'bg-white/25 hover:bg-white/40',
                    )}
                    onClick={() => setRecoPage(i)}
                  />
                ))}
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  )
}

function CartSummary({
  coupon,
  setCouponDraft,
  quote,
  quoteLoading,
  applyPending,
  onApply,
  onRemoveCoupon,
  hasItems,
}: {
  coupon: string
  setCouponDraft: (v: string) => void
  quote: Quote | undefined
  quoteLoading: boolean
  applyPending: boolean
  onApply: () => void
  onRemoveCoupon: () => void
  hasItems: boolean
}) {
  return (
    <aside
      className={cn(
        // Mobile: sticky full-bleed sheet (Figma)
        'fixed inset-x-0 bottom-0 z-30 rounded-t-[24px] bg-[#24160f] px-4 pt-5',
        'pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(0,0,0,0.55)]',
        // Desktop: bordered card in grid
        'md:static md:z-auto md:rounded-[8px] md:border md:border-white/10 md:bg-[#1a1410]',
        'md:p-5 md:shadow-none lg:p-6',
      )}
      aria-live="polite"
      aria-label="Resumo da carteira"
    >
      <h2 className="mb-5 hidden text-base font-bold text-foreground md:block">
        Resumo da carteira
      </h2>

      <div className="space-y-2">
        <label htmlFor="coupon" className="hidden text-sm text-foreground md:block">
          Código promocional
        </label>
        <div className="flex gap-2">
          <input
            id="coupon"
            value={coupon}
            onChange={(e) => setCouponDraft(e.target.value)}
            placeholder="Digite o código promocional..."
            className="h-11 min-w-0 flex-1 rounded-full border-0 bg-[#1a1410] px-4 text-sm text-foreground outline-none placeholder:text-placeholder ring-1 ring-[#3d2e24] focus:ring-text-accent md:rounded-[6px] md:border md:border-[#3d2e24] md:bg-transparent md:ring-0 md:focus:border-text-accent"
            autoComplete="off"
            aria-label="Código promocional"
          />
          <button
            type="button"
            className="inline-flex h-11 shrink-0 items-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 md:rounded-[6px] md:px-4"
            onClick={onApply}
            disabled={applyPending}
          >
            Aplicar
          </button>
          {quote?.couponCode ? (
            <button
              type="button"
              className="inline-flex h-11 shrink-0 items-center rounded-full border border-white/20 px-4 text-sm font-medium text-foreground transition hover:border-primary/50 disabled:opacity-50 md:rounded-[6px]"
              onClick={onRemoveCoupon}
              disabled={applyPending}
            >
              Remover cupom
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 space-y-3 text-sm md:mt-6">
        {quoteLoading ? <Skeleton className="h-28 w-full" /> : null}
        {quote ? (
          <>
            <div className="flex justify-between gap-4">
              <span className="text-text-secondary">Subtotal</span>
              <span>{formatEth(quote.subtotalEth, 2)} ETH</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-text-secondary">Desconto do lançamento</span>
              <span>
                (-){' '}
                {formatEth(quote.discountEth, 2) === '0.00'
                  ? '00.00'
                  : formatEth(quote.discountEth, 2)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-text-secondary">Taxa de rede</span>
              <div className="text-right">
                <p>{formatEth(quote.networkFeeEth, 3)} ETH</p>
                <p className="text-xs text-primary/80">Taxa estimada</p>
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-white/10 pt-4 text-base font-bold">
              <span>Total</span>
              <span className="text-[1.65rem] leading-none text-primary md:text-base md:leading-normal">
                {formatEth(quote.totalEth, 3)} ETH
              </span>
            </div>
          </>
        ) : null}
      </div>

      {quote?.stale ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          Cotação desatualizada — preços mudaram. Atualize antes de pagar.
        </p>
      ) : null}

      <Link
        to="/checkout"
        className={cn(
          'mt-5 flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground transition hover:bg-primary/90 md:mt-6 md:rounded-[8px]',
          !hasItems && 'pointer-events-none opacity-50',
        )}
        aria-disabled={!hasItems}
      >
        Conectar e finalizar
      </Link>
      <Link
        to="/"
        className="mt-4 hidden text-center text-sm text-text-secondary underline-offset-4 hover:text-primary hover:underline md:block"
      >
        Continuar explorando
      </Link>
    </aside>
  )
}

function MobileCartCard({
  item,
  lineTotal,
  busy,
  onQty,
  onRemove,
}: {
  item: CartItem
  lineTotal: string
  busy: boolean
  onQty: (quantity: number) => void
  onRemove: () => void
}) {
  const atMin = item.quantity <= 1

  return (
    <li className="flex items-center gap-3 rounded-[16px] bg-[#24160f] p-3">
      <img
        src={item.imageUrl}
        alt=""
        className="h-[72px] w-[72px] shrink-0 rounded-[12px] object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{item.nftName}</p>
        <p className="mt-0.5 text-xs text-[#A38E7A]">Edição: {item.editionLabel}</p>
        <p className="mt-1.5 text-base font-bold text-primary tabular-nums">
          {formatEth(lineTotal, 2)} ETH
        </p>
        {item.quantity > item.available ? (
          <p className="mt-1 text-xs text-destructive" role="status">
            Disponibilidade: {item.available}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {atMin ? (
          <QtyCircle
            label={`Remover ${item.nftName}`}
            onClick={onRemove}
            disabled={busy}
            tone="muted"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
          </QtyCircle>
        ) : (
          <QtyCircle
            label="Diminuir quantidade"
            onClick={() => onQty(item.quantity - 1)}
            disabled={busy}
            tone="muted"
          >
            <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
          </QtyCircle>
        )}
        <span className="min-w-[1.25rem] text-center text-sm font-medium tabular-nums" aria-live="polite">
          {item.quantity}
        </span>
        <QtyCircle
          label="Aumentar quantidade"
          onClick={() => onQty(item.quantity + 1)}
          disabled={busy || item.quantity >= item.available}
          tone="muted"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </QtyCircle>
      </div>
    </li>
  )
}

function DesktopCartRow({
  item,
  lineTotal,
  busy,
  onQty,
  onRemove,
}: {
  item: CartItem
  lineTotal: string
  busy: boolean
  onQty: (quantity: number) => void
  onRemove: () => void
}) {
  return (
    <li className="grid grid-cols-[minmax(0,1.6fr)_0.7fr_0.9fr_0.7fr_40px] items-center gap-4 py-5">
      <div className="flex min-w-0 items-center gap-4">
        <img
          src={item.imageUrl}
          alt=""
          className="h-16 w-16 shrink-0 rounded-[8px] object-cover"
        />
        <div className="min-w-0">
          <p className="truncate text-base font-medium text-foreground">{item.nftName}</p>
          <p className="mt-0.5 text-xs text-placeholder">ID do token · {item.editionLabel}</p>
          {item.quantity > item.available ? (
            <p className="mt-1 text-xs text-destructive" role="status">
              Disponibilidade: {item.available}
            </p>
          ) : null}
        </div>
      </div>

      <p className="text-right text-sm text-foreground">{formatEth(item.unitPriceEth, 2)} ETH</p>

      <div className="flex items-center justify-center gap-3">
        <QtyCircle
          label="Diminuir quantidade"
          onClick={() => onQty(item.quantity - 1)}
          disabled={busy || item.quantity <= 1}
          tone="primary"
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </QtyCircle>
        <span className="min-w-[1.5rem] text-center text-sm font-medium tabular-nums" aria-live="polite">
          {item.quantity}
        </span>
        <QtyCircle
          label="Aumentar quantidade"
          onClick={() => onQty(item.quantity + 1)}
          disabled={busy || item.quantity >= item.available}
          tone="primary"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </QtyCircle>
      </div>

      <p className="text-right text-sm font-medium text-primary">{formatEth(lineTotal, 2)} ETH</p>

      <button
        type="button"
        className="justify-self-center text-white/50 transition hover:text-destructive disabled:opacity-50"
        aria-label={`Remover ${item.nftName}`}
        disabled={busy}
        onClick={onRemove}
      >
        <Trash2 className="h-5 w-5" strokeWidth={1.75} />
      </button>
    </li>
  )
}

function QtyCircle({
  label,
  onClick,
  disabled,
  tone,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  tone: 'primary' | 'muted'
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-full transition disabled:opacity-40',
        tone === 'primary'
          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
          : 'bg-[#1a1410] text-[#CFB28C] ring-1 ring-[#CFB28C]/25 hover:bg-[#1a1410]/80',
      )}
    >
      {children}
    </button>
  )
}
