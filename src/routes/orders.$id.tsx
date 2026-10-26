import { QueryError } from '@/shared/ui/query-state'
import { useOwnerId } from '@/shared/api/query-keys'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { requireAuth } from '@/features/auth/require-auth'
import { clearAttempt, readAttempt } from '@/features/checkout/attempt'
import { endpoints } from '@/shared/api/endpoints'
import type { Order } from '@/shared/api/types'
import { formatEth } from '@/shared/lib/eth'
import { cn } from '@/shared/lib/utils'
import { Skeleton } from '@/shared/ui/skeleton'

export const Route = createFileRoute('/orders/$id')({
  beforeLoad: ({ params }) => requireAuth(`/orders/${params.id}`),
  component: OrderPage,
})

function OrderPage() {
  const ownerId = useOwnerId()
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const orderQuery = useQuery({
    queryKey: ['order', ownerId, id],
    queryFn: ({ signal }) => endpoints.getOrder(id, signal),
    refetchInterval: (q) => (q.state.data?.status === 'pending' ? 1500 : false),
  })
  useEffect(() => {
    if (orderQuery.data && orderQuery.data.status !== 'pending' && readAttempt(ownerId)?.orderId === id) {
      clearAttempt(ownerId)
      sessionStorage.removeItem(`kurio:checkout:${ownerId}`)
    }
  }, [orderQuery.data, ownerId, id])

  if (orderQuery.isLoading) {
    return (
      <div className="mx-auto flex max-w-[720px] justify-center px-6 py-16" aria-busy="true">
        <Skeleton className="h-[480px] w-full rounded-[12px]" />
      </div>
    )
  }

  if (orderQuery.isError) return <QueryError error={orderQuery.error} retry={() => { void orderQuery.refetch() }} />

  const order = orderQuery.data
  if (!order) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="text-2xl font-bold">Pedido não encontrado</h1>
        <Link to="/" className="mt-6 inline-block text-primary underline underline-offset-4">
          Início
        </Link>
      </div>
    )
  }

  if (order.status === 'pending') {
    return (
      <StatusShell>
        <h1 className="text-2xl font-bold text-foreground">Status do pedido</h1>
        <p className="mt-3 text-text-secondary" role="status">
          Aguardando confirmação da rede simulada…
        </p>
        <p className="mt-2 text-xs text-placeholder">Pedido {order.id}</p>
      </StatusShell>
    )
  }

  if (order.status === 'rejected') {
    return (
      <StatusShell>
        <h1 className="text-2xl font-bold text-foreground">Pagamento recusado</h1>
        <p className="mt-3 text-destructive" role="alert">
          {order.rejectionReason ?? 'Pagamento recusado'}
        </p>
        <Link
          to="/cart"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-[8px] bg-primary px-6 text-sm font-bold text-primary-foreground"
        >
          Voltar ao carrinho
        </Link>
      </StatusShell>
    )
  }

  const wallet = order.walletSnapshot
  const walletLabel = wallet?.walletType || wallet?.label || 'Carteira'
  const txShort = shortenTx(order.txRef)
  const dateLabel = formatOrderDate(order.updatedAt || order.createdAt)

  return (
    <div className="mx-auto flex max-w-[720px] justify-center px-4 py-10 sm:px-6 sm:py-14">
      <article
        className="relative w-full rounded-[12px] border border-white/10 border-b-primary bg-[#1a1410] px-5 py-8 sm:px-8 sm:py-10"
        aria-labelledby="order-confirmed-title"
      >
        <button
          type="button"
          className="absolute top-4 right-4 text-primary transition hover:text-text-accent"
          aria-label="Fechar"
          onClick={() => void navigate({ to: '/' })}
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </button>

        <div className="flex flex-col items-center text-center">
          <ThankYouIcon />
          <h1
            id="order-confirmed-title"
            className="mt-5 max-w-md text-lg font-bold text-foreground sm:text-xl"
          >
            Seus NFTs agora estão na sua carteira
          </h1>
          <p className="sr-only">Confirmado</p>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-4 border-y border-primary/70 py-4 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-primary/70">
          <MetaCell label="ID da transação" value={txShort} mono />
          <MetaCell label="Data" value={dateLabel} />
          <MetaCell label="Total" value={`${formatEth(order.totalEth, 3)} ETH`} accent />
          <MetaCell label="Carteira" value={walletLabel} />
        </dl>

        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-placeholder">Colecionador</dt><dd>{order.collectorName}</dd></div>
          <div><dt className="text-placeholder">E-mail</dt><dd className="break-all">{order.collectorEmail}</dd></div>
          <div className="sm:col-span-2"><dt className="text-placeholder">Endereço da carteira</dt><dd className="break-all">{wallet.address}</dd></div>
          {order.notes && <div className="sm:col-span-2"><dt className="text-placeholder">Observação</dt><dd className="break-words">{order.notes}</dd></div>}
        </dl>
        <section className="mt-8" aria-labelledby="tx-details-heading">
          <h2 id="tx-details-heading" className="mb-4 text-sm font-bold text-foreground">
            Detalhes da transação
          </h2>

          <div
            className="mb-2 hidden grid-cols-[minmax(0,1.6fr)_0.6fr_0.7fr] gap-3 text-xs text-placeholder md:grid"
            aria-hidden
          >
            <span>NFTs</span>
            <span className="text-center">Edições</span>
            <span className="text-right">Subtotal</span>
          </div>

          <ul className="divide-y divide-white/10">
            {order.items.map((item, i) => (
              <OrderLine key={`${item.nftId}-${i}`} item={item} />
            ))}
          </ul>
        </section>

        <div className="mt-6 space-y-2 text-sm">
          <div className="flex justify-end gap-8">
            <span className="text-foreground">Subtotal</span>
            <span className="min-w-[7rem] text-right text-primary">
              {formatEth(order.subtotalEth, 2)} ETH
            </span>
          </div>
          <div className="flex justify-end gap-8">
            <span className="text-foreground">Desconto</span>
            <span className="min-w-[7rem] text-right text-primary">
              (-) {formatEth(order.discountEth, 2)} ETH
            </span>
          </div>
          <div className="flex justify-end gap-8">
            <span className="text-foreground">Taxa de rede</span>
            <span className="min-w-[7rem] text-right text-primary">
              {formatEth(order.networkFeeEth, 3)} ETH
            </span>
          </div>
          <div className="flex justify-end gap-8 text-base font-bold">
            <span className="text-foreground">Total</span>
            <span className="min-w-[7rem] text-right text-primary">
              {formatEth(order.totalEth, 3)} ETH
            </span>
          </div>
        </div>

        <p className="mt-8 text-center text-xs leading-relaxed text-text-secondary sm:text-sm">
          Compra simulada na rede {order.network}. Nenhum pagamento ou transferência real foi realizado.
        </p>

        {order.explorerUrl ? (
          <div className="mt-6 flex justify-center">
            <a
              href={order.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 min-w-[200px] items-center justify-center rounded-[8px] bg-primary px-6 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
            >
              Ver no Etherscan
            </a>
          </div>
        ) : null}
      </article>
    </div>
  )
}

function StatusShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[560px] justify-center px-6 py-16">
      <div className="w-full rounded-[12px] border border-white/10 border-b-primary bg-[#1a1410] px-6 py-10 text-center">
        {children}
      </div>
    </div>
  )
}

function MetaCell({
  label,
  value,
  mono,
  accent,
}: {
  label: string
  value: string
  mono?: boolean
  accent?: boolean
}) {
  return (
    <div className="px-0 text-left sm:px-3 sm:text-center">
      <dt className="text-[11px] text-placeholder">{label}</dt>
      <dd
        className={cn(
          'mt-1 text-sm font-medium break-all',
          accent ? 'text-primary' : 'text-foreground',
          mono && 'font-mono text-xs sm:text-sm',
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function OrderLine({ item }: { item: Order['items'][number] }) {
  const tokenId = tokenIdFromName(item.nftName, item.editionLabel)
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-4 md:grid-cols-[minmax(0,1.6fr)_0.6fr_0.7fr]">
      <div className="flex min-w-0 items-center gap-3">
        <img
          src={item.imageUrl}
          alt=""
          className="h-12 w-12 shrink-0 rounded-[8px] object-cover sm:h-14 sm:w-14"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{item.nftName}</p>
          <p className="text-xs text-placeholder">ID do token: {tokenId}</p>
        </div>
      </div>
      <p className="hidden text-center text-sm text-foreground md:block">(x {item.quantity})</p>
      <div className="text-right">
        <p className="text-sm font-medium text-primary">{formatEth(item.lineTotalEth, 2)} ETH</p>
        <p className="text-xs text-placeholder md:hidden">(x {item.quantity})</p>
      </div>
    </li>
  )
}

function ThankYouIcon() {
  return (
    <svg
      viewBox="0 0 64 48"
      className="h-12 w-16 text-primary"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <rect x="8" y="10" width="48" height="32" rx="3" />
      <path d="M8 14 L32 28 L56 14" />
      <rect x="18" y="18" width="28" height="16" rx="1.5" className="fill-[#1a1410]" />
      <text
        x="32"
        y="29"
        textAnchor="middle"
        className="fill-primary"
        style={{ fontSize: '6px', fontFamily: 'inherit', fontWeight: 700 }}
        stroke="none"
      >
        THANK YOU
      </text>
    </svg>
  )
}

function shortenTx(tx: string | null) {
  if (!tx) return '—'
  if (tx.length < 14) return tx
  return `${tx.slice(0, 6)}...${tx.slice(-4)}`
}

function formatOrderDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
    .format(d)
    .replace(/(\d+) (\w+) (\d+)/, (_, day, month, year) => `${day} ${month}, ${year}`)
}

function tokenIdFromName(name: string, editionLabel: string) {
  const m = name.match(/#(\d+)/)
  if (m) return `#${m[1]!.padStart(4, '0')}`
  return editionLabel || '—'
}
