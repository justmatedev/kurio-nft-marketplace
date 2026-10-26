import { quoteChanges } from '@/features/checkout/quote-changes'
import { QueryRefresh, focusFirstError } from '@/shared/ui/query-state'
import { useOwnerId } from '@/shared/api/query-keys'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, MoreVertical } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { RequiredMark, profileFieldClass } from '@/features/account/account-shell'
import { requireAuth } from '@/features/auth/require-auth'
import { useAuth } from '@/features/auth/session'
import { endpoints } from '@/shared/api/endpoints'
import { getToken, getApiError } from '@/shared/api/client'
import { clearAttempt, readAttempt, writeAttempt, type PurchaseAttempt } from '@/features/checkout/attempt'
import { orderSchema, walletSchema, validationFields } from '@/shared/api/validation'
import type { Wallet, Quote } from '@/shared/api/types'
import { formatEth, mulEth } from '@/shared/lib/eth'
import { cn } from '@/shared/lib/utils'
import { Skeleton } from '@/shared/ui/skeleton'

export const Route = createFileRoute('/checkout')({
  beforeLoad: () => requireAuth('/checkout'),
  component: CheckoutPage,
})

const NETWORKS = ['Ethereum', 'Polygon', 'Arbitrum', 'Solana'] as const
const WALLET_TYPES = ['MetaMask', 'WalletConnect', 'Coinbase Wallet', 'Ledger'] as const
const ENS_TLDS = ['.eth', '.xyz', '.crypto'] as const
const PROVIDERS = [
  { id: 'WalletConnect', letter: 'W', round: false },
  { id: 'MetaMask', letter: 'M', round: false },
  { id: 'Coinbase Wallet', letter: 'C', round: true },
] as const

function shortAddress(addr: string) {
  if (addr.length < 12) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function networkCaption(network: string) {
  if (network === 'Ethereum') return 'Rede principal Ethereum'
  return `Rede ${network}`
}

function walletEnsOrAddress(w: Wallet) {
  if (w.ensName) return `${w.ensName}${w.ensTld || '.eth'}`
  return shortAddress(w.address)
}

function CheckoutPage() {
  const { user, isLoading } = useAuth()
  if (isLoading || !user) return <Skeleton className="mx-auto my-12 h-96 max-w-4xl" />
  return <CheckoutContent key={user.id} />
}

function CheckoutContent() {
  const ownerId = useOwnerId()
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const initialDraft = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem(`kurio:checkout:${ownerId}`) || '{}') as Record<string, string> } catch { return {} }
  }, [ownerId])
  const [attempt, setAttempt] = useState<PurchaseAttempt | null>(() => readAttempt(ownerId))
  const submitLock = useRef(false)
  const recovering = useRef(false)

  const cartQuery = useQuery({ queryKey: ['cart', ownerId], queryFn: ({ signal }) => endpoints.cart(signal) })
  const walletsQuery = useQuery({ queryKey: ['wallets', ownerId], queryFn: ({ signal }) => endpoints.wallets(signal) })
  const wallets = walletsQuery.data ?? []
  const primary = wallets.find((w) => w.isPrimary) ?? wallets[0]

  const [walletId, setWalletId] = useState('')
  const selectedWallet = wallets.find((w) => w.id === walletId) ?? primary

  const [displayName, setDisplayName] = useState(initialDraft.displayName ?? (user?.name ?? ''))
  const [username, setUsername] = useState(initialDraft.username ?? (user?.username ?? ''))
  const [email, setEmail] = useState(initialDraft.email ?? (user?.email ?? ''))
  const [network, setNetwork] = useState<string>(primary?.network ?? 'Ethereum')
  const [profileName, setProfileName] = useState(primary?.profileName ?? user?.username ?? '')
  const [address, setAddress] = useState(primary?.address ?? '')
  const [secondaryRef, setSecondaryRef] = useState(primary?.secondaryRef ?? '')
  const [walletType, setWalletType] = useState(primary?.walletType ?? 'MetaMask')
  const [referralCode, setReferralCode] = useState(primary?.referralCode ?? '')
  const [ensName, setEnsName] = useState(primary?.ensName ?? user?.ensName ?? '')
  const [ensTld, setEnsTld] = useState(primary?.ensTld ?? user?.ensTld ?? '.eth')
  const [useOtherWallet, setUseOtherWallet] = useState(false)
  const [notes, setNotes] = useState(initialDraft.notes ?? '')
  const [walletStatus, setWalletStatus] = useState<
    'idle' | 'connecting' | 'connected' | 'refused' | 'disconnected'
  >('idle')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [reviewedQuote, setReviewedQuote] = useState<Quote | null>(null)
  const [quoteConflict, setQuoteConflict] = useState(false)
  const quoteQuery = useQuery({
    queryKey: ['quote', ownerId, 'checkout', cartQuery.data?.couponCode, cartQuery.data?.revision, walletId, network],
    queryFn: ({ signal }) => endpoints.quote(cartQuery.data?.couponCode ?? null, walletId, network, signal),
    enabled: Boolean(cartQuery.data && walletId),
  })
  useEffect(() => {
    sessionStorage.setItem(`kurio:checkout:${ownerId}`, JSON.stringify({ displayName, username, email, notes, walletId, network, profileName, address, secondaryRef, walletType, referralCode, ensName, ensTld }))
  }, [ownerId, displayName, username, email, notes, walletId, network, profileName, address, secondaryRef, walletType, referralCode, ensName, ensTld])
  useEffect(() => {
    if (quoteQuery.data && !reviewedQuote && !quoteConflict) setReviewedQuote(quoteQuery.data)
  }, [quoteQuery.data, reviewedQuote, quoteConflict])
  const hydratedRef = useRef(false)

  useEffect(() => {
    if (!primary) return
    if (!hydratedRef.current) {
      hydratedRef.current = true
      const restored = wallets.find(w => w.id === initialDraft.walletId) ?? primary
      setWalletId(restored.id)
      setNetwork(initialDraft.network ?? (restored.network))
      setProfileName(initialDraft.profileName ?? (restored.profileName ?? user?.username ?? ''))
      setAddress(initialDraft.address ?? (restored.address))
      setSecondaryRef(initialDraft.secondaryRef ?? (restored.secondaryRef ?? ''))
      setWalletType(initialDraft.walletType ?? (restored.walletType ?? 'MetaMask'))
      setReferralCode(initialDraft.referralCode ?? (restored.referralCode ?? ''))
      setEnsName(initialDraft.ensName ?? (restored.ensName ?? user?.ensName ?? ''))
      setEnsTld(initialDraft.ensTld ?? (restored.ensTld ?? user?.ensTld ?? '.eth'))
    }
    // User may resolve after wallets — keep collector fields in sync once.

  }, [primary, user, wallets, initialDraft])

  const selectWallet = (w: Wallet) => {
    setWalletId(w.id)
    setWalletStatus('idle')
    if (!useOtherWallet) {
      setNetwork(w.network)
      setProfileName(w.profileName ?? profileName)
      setAddress(w.address)
      setSecondaryRef(w.secondaryRef ?? '')
      setWalletType(w.walletType ?? walletType)
      setReferralCode(w.referralCode ?? '')
      setEnsName(w.ensName ?? ensName)
      setEnsTld(w.ensTld ?? ensTld)
    }
  }

  const isCurrentSession = () => getToken() === token
  const finishOrder = (order: import('@/shared/api/types').Order) => {
    if (!isCurrentSession()) return
    const current = readAttempt(ownerId)
    if (current) writeAttempt(ownerId, { ...current, orderId: order.id })
    void queryClient.invalidateQueries({ queryKey: ['cart', ownerId] })
    void navigate({ to: '/orders/$id', params: { id: order.id } })
  }
  const placeOrder = useMutation({
    mutationFn: async (pending: PurchaseAttempt) => {
      try { return await endpoints.recoverOrder(pending.key) }
      catch (e) { if (getApiError(e).code !== 'NOT_FOUND') throw e }
      if (!isCurrentSession()) throw new Error('Sessão alterada')
      return endpoints.createOrder(pending.body, pending.key)
    },
    onSuccess: finishOrder,
    onError: async (e) => {
      if (!isCurrentSession()) return
      const error = getApiError(e)
      if (['QUOTE_CHANGED', 'CONFLICT', 'VALIDATION', 'FORBIDDEN', 'IDEMPOTENCY_CONFLICT'].includes(error.code)) {
        clearAttempt(ownerId)
        setAttempt(null)
      }
      if (error.code === 'QUOTE_CHANGED') { setQuoteConflict(true); void quoteQuery.refetch() }
      if (error.fields) setFieldErrors(error.fields)
      if (error.code === 'TRANSIENT') {
        const pending = readAttempt(ownerId)
        if (pending) { try { finishOrder(await endpoints.recoverOrder(pending.key)); return } catch { /* Retry remains available with the same attempt. */ } }
      }
      toast.error(error.message)
    },
    onSettled: () => { submitLock.current = false },
  })
  useEffect(() => {
    if (!attempt || recovering.current) return
    recovering.current = true
    placeOrder.mutate(attempt)
    // One recovery per mount. An explicit retry preserves the same key and body.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const walletDirty = Boolean(selectedWallet && (address !== selectedWallet.address || network !== selectedWallet.network || profileName !== (selectedWallet.profileName ?? user?.username ?? '') || secondaryRef !== (selectedWallet.secondaryRef ?? '') || walletType !== (selectedWallet.walletType ?? 'MetaMask') || referralCode !== (selectedWallet.referralCode ?? '') || ensName !== (selectedWallet.ensName ?? user?.ensName ?? '') || ensTld !== (selectedWallet.ensTld ?? user?.ensTld ?? '.eth')))
  const saveWallet = useMutation({
    mutationFn: async () => {
      const body = { label: selectedWallet?.label ?? 'Minha carteira', address, network, isPrimary: selectedWallet?.isPrimary ?? false,
        profileName, secondaryRef, walletType, referralCode, ensName, ensTld, email }
      const parsed = walletSchema.safeParse(body)
      if (!parsed.success) { setFieldErrors(validationFields(parsed.error)); focusFirstError(); throw new Error('Revise os dados da carteira') }
      return (useOtherWallet || !selectedWallet) ? endpoints.createWallet(body) : endpoints.updateWallet(walletId, body)
    },
    onSuccess: async (wallet) => {
      if (!isCurrentSession()) return
      await queryClient.invalidateQueries({ queryKey: ['wallets', ownerId] })
      setWalletId(wallet.id)
      setUseOtherWallet(false)
      setWalletStatus('idle')
      setQuoteConflict(true)
      void quoteQuery.refetch()
      toast.success('Carteira salva. Revise e conecte para continuar.')
    },
    onError: e => { if (isCurrentSession()) toast.error(getApiError(e).message) },
  })

  const connectionRevision = useRef(0)
  useEffect(() => { connectionRevision.current++; setWalletStatus('idle') }, [walletId, network, address, walletDirty, useOtherWallet])

  const connectWallet = async () => {
    const revision = connectionRevision.current
    setWalletStatus('connecting')
    await new Promise((r) => setTimeout(r, 600))
    if (revision !== connectionRevision.current || !isCurrentSession()) return
    if (!walletId || walletDirty || useOtherWallet) {
      setWalletStatus('refused')
      toast.error('Selecione uma carteira')
      return
    }
    setWalletStatus('connected')
    toast.success('Carteira conectada (simulado)')
  }

  const refuseWallet = async () => {
    const revision = connectionRevision.current
    setWalletStatus('connecting')
    await new Promise((r) => setTimeout(r, 500))
    if (revision !== connectionRevision.current || !isCurrentSession()) return
    setWalletStatus('refused')
    toast.error('Conexão recusada pela carteira (simulado)')
  }

  const disconnectWallet = () => {
    setWalletStatus('disconnected')
    toast.message('Carteira desconectada')
  }

  const walletStatusLabel: Record<typeof walletStatus, string> = {
    idle: 'idle — aguardando conexão',
    connecting: 'connecting — solicitando autorização…',
    connected: 'connected',
    refused: 'refused — usuário/carteira recusou',
    disconnected: 'disconnected',
  }

  const onConfirm = () => {
    if (submitLock.current || placeOrder.isPending) return
    if (attempt) { submitLock.current = true; placeOrder.mutate(attempt); return }
    if (!quoteQuery.data || quoteQuery.isFetching || stale || quoteBlocked || walletDirty || useOtherWallet || walletStatus !== 'connected') return
    const parsed = orderSchema.safeParse({
      quoteId: quoteQuery.data.quoteId, collectorName: displayName, collectorEmail: email,
      collectorUsername: username, notes, walletId, network,
    })
    const next = parsed.success ? {} : validationFields(parsed.error)
    if (!parsed.success) {
      setFieldErrors({ ...next, displayName: next.collectorName ?? '', email: next.collectorEmail ?? '', username: next.collectorUsername ?? '' })
      focusFirstError()
      return
    }
    const pending = { userId: ownerId, key: `idem_${crypto.randomUUID()}`, body: parsed.data }
    writeAttempt(ownerId, pending)
    setAttempt(pending)
    submitLock.current = true
    placeOrder.mutate(pending)
  }

  if (cartQuery.isLoading || walletsQuery.isLoading) {
    return (
      <div className="mx-auto max-w-[1440px] space-y-8 px-6 py-10 lg:px-[120px]" aria-busy="true">
        <Skeleton className="h-4 w-56" />
        <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
          <Skeleton className="h-[480px] w-full" />
          <Skeleton className="h-[520px] w-full" />
        </div>
      </div>
    )
  }

  if ((cartQuery.isError && !cartQuery.data) || (walletsQuery.isError && !walletsQuery.data)) return <div role="alert" className="mx-auto max-w-xl p-8"><p>{getApiError(cartQuery.error ?? walletsQuery.error ?? quoteQuery.error).message}</p><button className="mt-4 underline" onClick={() => { void cartQuery.refetch(); void walletsQuery.refetch(); void quoteQuery.refetch() }}>Tentar novamente</button></div>

  const cart = cartQuery.data
  const quote = quoteQuery.data
  const stale = quoteConflict || Boolean(quote && reviewedQuote && quote.revision !== reviewedQuote.revision)
  const hasItems = Boolean(cart?.items.length)
  const quoteBlocked = Boolean(quote && (!quote.couponValid || quote.items.some(i => i.quantity > i.available)))

  const acceptUpdatedQuote = () => {
    if (!quote || quoteQuery.isFetching) return
    setReviewedQuote(quote)
    setQuoteConflict(false)
    toast.success('Novos valores aceitos. Confirme a compra quando estiver pronto.')
  }

  const collectorForm = (idPrefix: string) => (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field
        id={`${idPrefix}display-name`}
        label="Nome de exibição"
        required
        value={displayName}
        error={fieldErrors.displayName}
        onChange={setDisplayName}
      />
      <Field
        id={`${idPrefix}username`}
        label="Nome de usuário"
        required
        value={username}
        error={fieldErrors.username}
        onChange={setUsername}
        autoComplete="username"
      />
      <SelectField
        id={`${idPrefix}network`}
        label="Rede"
        required
        value={network}
        error={fieldErrors.network}
        onChange={(value) => { setNetwork(value); setWalletStatus('idle') }}
        placeholder="Selecione uma rede"
        options={NETWORKS.map((n) => ({ value: n, label: n }))}
      />
      <Field
        id={`${idPrefix}profile-name`}
        label="Nome do perfil (opcional)"
        value={profileName}
        onChange={setProfileName}
      />
      <Field
        id={`${idPrefix}wallet-address`}
        label="Endereço da carteira"
        required
        value={address}
        error={fieldErrors.address}
        onChange={(value) => { setAddress(value); setWalletStatus('idle') }}
        placeholder="Endereço 0x da carteira"
      />
      <Field
        id={`${idPrefix}secondary-ref`}
        label="ENS ou carteira secundária (opcional)"
        value={secondaryRef}
        onChange={setSecondaryRef}
      />
      <SelectField
        id={`${idPrefix}wallet-type`}
        label="Tipo de carteira"
        required
        value={walletType}
        error={fieldErrors.walletType}
        onChange={setWalletType}
        placeholder="Selecione uma carteira"
        options={WALLET_TYPES.map((t) => ({ value: t, label: t }))}
      />
      <Field
        id={`${idPrefix}referral`}
        label="Código de indicação (opcional)"
        value={referralCode}
        onChange={setReferralCode}
      />
      <Field
        id={`${idPrefix}email`}
        label="E-mail"
        required
        type="email"
        value={email}
        error={fieldErrors.email}
        onChange={setEmail}
        autoComplete="email"
      />
      <div>
        <label htmlFor={`${idPrefix}ens-name`} className="mb-2 block text-sm text-foreground">
          Nome ENS (opcional)
        </label>
        <div className="flex overflow-hidden rounded-[6px] border border-[#3d2e24] focus-within:border-text-accent">
          <select
            aria-label="Sufixo ENS"
            className="h-11 border-r border-[#3d2e24] bg-transparent px-3 text-sm text-foreground outline-none"
            value={ensTld}
            onChange={(e) => setEnsTld(e.target.value)}
          >
            {ENS_TLDS.map((tld) => (
              <option key={tld} value={tld} className="bg-[#140d0a]">
                {tld}
              </option>
            ))}
          </select>
          <input
            id={`${idPrefix}ens-name`}
            value={ensName}
            onChange={(e) => setEnsName(e.target.value)}
            placeholder="nome"
            className="h-11 min-w-0 flex-1 bg-transparent px-3.5 text-sm text-foreground outline-none placeholder:text-placeholder"
          />
        </div>
      </div>
      {(walletDirty || useOtherWallet || !selectedWallet) && <button type="button" className="rounded border border-primary p-3 text-primary sm:col-span-2" disabled={saveWallet.isPending} onClick={() => saveWallet.mutate()}>{useOtherWallet || !selectedWallet ? 'Cadastrar e usar carteira' : 'Salvar alterações da carteira'}</button>}
    </div>
  )

  const staleBanner = (
    <div className="space-y-2" role="alert">
      <p className="text-sm text-destructive">
        Cotação desatualizada. Aceite os novos valores antes de confirmar.
        {reviewedQuote && quote ? ` Total anterior: ${formatEth(reviewedQuote.totalEth)} ETH. Total atual: ${formatEth(quote.totalEth)} ETH.` : ''}
      </p>
      {reviewedQuote && quote && <ul className="space-y-1 text-xs text-text-secondary">{quoteChanges(reviewedQuote, quote).map(change => <li key={change}>{change}</li>)}</ul>}
      <button
        type="button"
        className="inline-flex h-9 items-center rounded-[6px] border border-primary/50 px-3 text-xs font-medium text-primary hover:bg-primary/10"
        onClick={acceptUpdatedQuote}
      >
        Aceitar novos valores
      </button>
    </div>
  )

  const selectProvider = (providerId: string) => {
    setWalletType(providerId)
    const match = wallets.find((w) =>
      (w.walletType ?? '').toLowerCase().includes(providerId.toLowerCase().split(' ')[0]!),
    )
    if (match) selectWallet(match)
  }

  const simControls = (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex h-9 items-center rounded-[6px] border border-white/15 px-3 text-xs font-medium text-foreground hover:border-primary/50 disabled:opacity-50"
          disabled={walletStatus === 'connecting' || !walletId}
          onClick={() => void connectWallet()}
        >
          {walletStatus === 'connecting' ? 'Conectando…' : 'Simular conexão'}
        </button>
        <button
          type="button"
          className="inline-flex h-9 items-center rounded-[6px] border border-white/15 px-3 text-xs font-medium text-foreground hover:border-primary/50 disabled:opacity-50"
          disabled={walletStatus === 'connecting' || !walletId}
          onClick={() => void refuseWallet()}
        >
          Simular recusa
        </button>
        <button
          type="button"
          className="inline-flex h-9 items-center rounded-[6px] border border-white/15 px-3 text-xs font-medium text-foreground hover:border-primary/50 disabled:opacity-50"
          disabled={walletStatus !== 'connected'}
          onClick={disconnectWallet}
        >
          Desconectar
        </button>
      </div>
      <p
        className={cn(
          'text-xs',
          walletStatus === 'refused' ? 'text-destructive' : 'text-placeholder',
        )}
        role="status"
      >
        Status da carteira: {walletStatusLabel[walletStatus]}
      </p>
      {quoteBlocked && <p role="alert" className="text-sm text-destructive">Cupom inválido ou estoque insuficiente. Revise o carrinho para continuar.</p>}
      {fieldErrors.wallet ? <p className="text-xs text-destructive">{fieldErrors.wallet}</p> : null}
    </div>
  )

  return (
    <div className="mx-auto max-w-[1440px] pb-8 md:px-6 md:py-8 md:pb-8 lg:px-[120px] lg:py-10">
      <QueryRefresh fetching={cartQuery.isFetching || walletsQuery.isFetching || quoteQuery.isFetching} error={cartQuery.error ?? walletsQuery.error ?? quoteQuery.error} retry={() => { void cartQuery.refetch(); void walletsQuery.refetch(); void quoteQuery.refetch() }} />
      {/* Mobile header (Figma) */}
      <header className="relative mb-5 flex items-center justify-center px-4 pt-3 md:hidden">
        <button
          type="button"
          className="absolute left-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#24160f] text-[#CFB28C]"
          aria-label="Voltar"
          onClick={() => {
            if (window.history.length > 1) window.history.back()
            else void navigate({ to: '/cart' })
          }}
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <h1 className="pl-10 text-center text-base font-medium text-foreground">Pagamento com carteira</h1>
      </header>

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
            Pagamento
          </li>
        </ol>
      </nav>

      {!hasItems ? (
        <p className="px-4 text-text-secondary md:px-0">
          Carrinho vazio.{' '}
          <Link to="/cart" className="text-primary underline underline-offset-4">
            Voltar ao carrinho
          </Link>
        </p>
      ) : (
        <>
          {/* ——— Mobile (Figma) ——— */}
          <div className="space-y-8 px-4 md:hidden">
            <section aria-labelledby="m-collector-heading" className="min-w-0">
              <h2 id="m-collector-heading" className="mb-4 text-base font-bold text-foreground">
                Perfil do colecionador
              </h2>
              {collectorForm('m-')}
              <label className="mt-5 flex cursor-pointer items-center gap-2.5 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={useOtherWallet}
                  onChange={(e) => setUseOtherWallet(e.target.checked)}
                />
                Usar outra carteira?
              </label>
              <div className="mt-4">
                <label htmlFor="m-notes" className="mb-2 block text-sm text-foreground">
                  Observação do colecionador (opcional)
                </label>
                <textarea
                  id="m-notes"
                  rows={4}
                  aria-invalid={Boolean(fieldErrors.notes) || undefined}
                  aria-describedby={fieldErrors.notes ? 'm-notes-error' : undefined}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={cn(profileFieldClass, 'h-auto min-h-[96px] resize-y py-3')}
                />
                {fieldErrors.notes && <p id="m-notes-error" className="text-sm text-destructive">{fieldErrors.notes}</p>}
              </div>
            </section>

            <section aria-labelledby="connected-wallets-heading">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 id="connected-wallets-heading" className="text-sm font-medium text-foreground">
                  Carteira conectada
                </h2>
                <Link to="/wallets" className="text-sm font-medium text-primary">
                  Trocar carteira
                </Link>
              </div>
              {wallets.length === 0 ? (
                <p className="text-sm text-placeholder">
                  Nenhuma carteira cadastrada.{' '}
                  <Link to="/wallets" className="text-primary underline">
                    Cadastrar
                  </Link>
                </p>
              ) : (
                <ul className="space-y-2.5" role="radiogroup" aria-label="Carteira conectada">
                  {wallets.map((w) => {
                    const selected = w.id === (selectedWallet?.id ?? walletId)
                    return (
                      <li key={w.id}>
                        <div
                          className={cn(
                            'flex w-full items-center gap-3 rounded-[14px] bg-[#24160f] px-3 py-3.5',
                            selected && 'ring-1 ring-primary/40',
                          )}
                        >
                          <button
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            aria-label={`Selecionar ${w.label}`}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                            onClick={() => selectWallet(w)}
                          >
                            <span
                              className={cn(
                                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                                selected ? 'border-primary' : 'border-white/30',
                              )}
                              aria-hidden
                            >
                              {selected ? (
                                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                              ) : null}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-bold text-foreground">
                                {w.label}
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-[#A38E7A]">
                                {walletEnsOrAddress(w)}
                              </span>
                              <span className="block truncate text-xs text-[#A38E7A]">
                                {networkCaption(w.network)}
                              </span>
                            </span>
                          </button>
                          <Link
                            to="/wallets"
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-[#A38E7A] hover:text-foreground"
                            aria-label={`Gerenciar ${w.label}`}
                          >
                            <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
                          </Link>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section aria-labelledby="provider-heading">
              <h2 id="provider-heading" className="mb-3 text-sm font-medium text-foreground">
                Carteira e rede
              </h2>
              <div className="space-y-2.5" role="radiogroup" aria-label="Provedor de carteira">
                {PROVIDERS.map((p) => {
                  const selected = walletType === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-[14px] bg-[#24160f] px-3 py-3.5 text-left',
                        selected && 'ring-1 ring-primary/40',
                      )}
                      onClick={() => selectProvider(p.id)}
                    >
                      <span
                        className={cn(
                          'inline-flex h-9 w-9 shrink-0 items-center justify-center bg-[#3a2a1f] text-sm font-bold text-[#CFB28C]',
                          p.round ? 'rounded-full' : 'rounded-[8px]',
                        )}
                        aria-hidden
                      >
                        {p.letter}
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
                        {p.id}
                      </span>
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                          selected ? 'border-primary' : 'border-white/30',
                        )}
                        aria-hidden
                      >
                        {selected ? <span className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>

            <div className="pb-2">{simControls}</div>

            {/* Summary stays in the document flow so zoom never hides form fields. */}
            <div className="border-t border-white/10 bg-background/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm">
              <div className="mb-3 flex items-baseline justify-end gap-2">
                <span className="text-sm text-foreground">Total:</span>
                <span className="text-[1.35rem] font-bold tabular-nums text-primary">
                  {quote ? `${formatEth(quote.totalEth, 3)} ETH` : '—'}
                </span>
              </div>
              <button
                type="button"
                className="flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                disabled={
                  placeOrder.isPending || (!attempt && (stale || quoteBlocked || !hasItems || quoteQuery.isFetching || !quote || walletDirty || useOtherWallet || walletStatus !== 'connected'))
                }
                onClick={onConfirm}
              >
                {placeOrder.isPending ? 'Enviando pedido…' : attempt ? 'Recuperar compra' : 'Confirmar compra'}
              </button>
              {stale ? <div className="mt-3">{staleBanner}</div> : null}
            </div>
          </div>

          {/* ——— Desktop ——— */}
          <div className="hidden items-start gap-10 md:grid lg:grid-cols-[minmax(0,1fr)_380px] xl:gap-14">
          <section aria-labelledby="collector-heading" className="min-w-0">
            <h2 id="collector-heading" className="mb-6 text-xl font-bold text-foreground sm:text-2xl">
              Perfil do colecionador
            </h2>

            {collectorForm('')}

            <label className="mt-5 flex cursor-pointer items-center gap-2.5 text-sm text-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={useOtherWallet}
                onChange={(e) => setUseOtherWallet(e.target.checked)}
              />
              Usar outra carteira?
            </label>

            <div className="mt-5">
              <label htmlFor="notes" className="mb-2 block text-sm text-foreground">
                Observação do colecionador (opcional)
              </label>
              <textarea
                id="notes"
                rows={5}
                aria-invalid={Boolean(fieldErrors.notes) || undefined}
                aria-describedby={fieldErrors.notes ? 'notes-error' : undefined}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={cn(profileFieldClass, 'h-auto min-h-[120px] resize-y py-3')}
              />
              {fieldErrors.notes && <p id="notes-error" className="text-sm text-destructive">{fieldErrors.notes}</p>}
            </div>
          </section>

          <aside className="rounded-[8px] border border-white/10 bg-[#1a1410] p-5 sm:p-6" aria-live="polite">
            <h2 className="mb-5 text-base font-bold text-foreground">Seus NFTs</h2>

            <ul className="space-y-4">
              {cart!.items.map((item) => {
                const line =
                  quote?.items.find((q) => q.cartItemId === item.id)?.lineTotalEth ??
                  mulEth(item.unitPriceEth, item.quantity)
                return (
                  <li key={item.id} className="flex gap-3">
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-[8px] object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{item.nftName}</p>
                      <p className="text-xs text-placeholder">
                        ID do token · {item.editionLabel} · x{item.quantity}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium text-primary">
                      {formatEth(line, 2)} ETH
                    </p>
                  </li>
                )
              })}
            </ul>

            <Link
              to="/cart"
              className="mt-5 block text-sm text-text-secondary underline-offset-4 hover:text-primary hover:underline"
            >
              Tem um código promocional? Aplique aqui
            </Link>

            <div className="mt-5 space-y-3 text-sm">
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
                    <div>
                      <p className="text-text-secondary">Taxa de rede</p>
                      <p className="text-xs text-placeholder">Taxa estimada</p>
                    </div>
                    <span>{formatEth(quote.networkFeeEth, 3)} ETH</span>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-white/10 pt-4 text-base font-bold">
                    <span>Total</span>
                    <span className="text-primary">{formatEth(quote.totalEth, 3)} ETH</span>
                  </div>
                </>
              ) : null}
            </div>

            {stale ? <div className="mt-4">{staleBanner}</div> : null}

            <div className="mt-6 space-y-3">
              <p className="text-sm font-medium text-foreground">Carteira e rede</p>

              <div className="space-y-2" role="radiogroup" aria-label="Carteira e rede">
                {wallets.length === 0 ? (
                  <p className="text-sm text-placeholder">
                    Nenhuma carteira cadastrada.{' '}
                    <Link to="/wallets" className="text-primary underline">
                      Cadastrar
                    </Link>
                  </p>
                ) : (
                  wallets.map((w) => {
                    const selected = w.id === (selectedWallet?.id ?? walletId)
                    return (
                      <button
                        key={w.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-[8px] border px-3 py-3 text-left transition',
                          selected
                            ? 'border-primary bg-primary/5'
                            : 'border-white/10 hover:border-white/25',
                        )}
                        onClick={() => selectWallet(w)}
                      >
                        <span
                          className={cn(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                            selected ? 'border-primary' : 'border-white/30',
                          )}
                          aria-hidden
                        >
                          {selected ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-foreground">
                            {w.walletType || w.label}
                          </span>
                          <span className="block truncate text-xs text-placeholder">
                            {w.address}
                          </span>
                        </span>
                        <WalletLogos type={w.walletType} />
                      </button>
                    )
                  })
                )}
              </div>

              <div className="pt-1">{simControls}</div>
            </div>

            <button
              type="button"
              className="mt-6 flex h-12 w-full items-center justify-center rounded-[8px] bg-primary text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
              disabled={
                placeOrder.isPending || (!attempt && (stale || quoteBlocked || !hasItems || quoteQuery.isFetching || !quote || walletDirty || useOtherWallet || walletStatus !== 'connected'))
              }
              onClick={onConfirm}
            >
              {placeOrder.isPending ? 'Enviando pedido…' : attempt ? 'Recuperar compra' : 'Confirmar compra'}
            </button>
          </aside>
          </div>
        </>
      )}
    </div>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  required,
  type = 'text',
  autoComplete,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  required?: boolean
  type?: string
  autoComplete?: string
  placeholder?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm text-foreground">
        {label} {required ? <RequiredMark /> : null}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        aria-required={required || undefined}
        value={value}
        placeholder={placeholder}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={profileFieldClass}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? <p id={`${id}-error`} className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
  error,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
  placeholder?: string
  required?: boolean
  error?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm text-foreground">
        {label} {required ? <RequiredMark /> : null}
      </label>
      <select
        id={id}
        value={value}
        aria-required={required || undefined}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(profileFieldClass, 'appearance-none')}
        onChange={(e) => onChange(e.target.value)}
      >
        {placeholder ? (
          <option value="" className="bg-[#140d0a]">
            {placeholder}
          </option>
        ) : null}
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#140d0a]">
            {o.label}
          </option>
        ))}
      </select>
      {error ? <p id={`${id}-error`} className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function WalletLogos({ type }: { type?: string | null }) {
  const t = (type ?? '').toLowerCase()
  if (t.includes('coinbase')) {
    return <LogoPill>CB</LogoPill>
  }
  if (t.includes('walletconnect')) {
    return <LogoPill>WC</LogoPill>
  }
  return (
    <span className="flex items-center gap-1" aria-hidden>
      <LogoPill>MM</LogoPill>
    </span>
  )
}

function LogoPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-foreground">
      {children}
    </span>
  )
}
