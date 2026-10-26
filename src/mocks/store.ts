import { addEth, eth, mulEth } from '@/shared/lib/eth'
import type {
  Cart,
  CreateOrderInput,
  CartItem,
  Favorite,
  Nft,
  NftUpdatedEvent,
  Order,
  OrderUpdatedEvent,
  Quote,
  ScenarioId,
  Session,
  User,
  Wallet,
} from '@/shared/api/types'
import { nftFixtures } from '@/mocks/fixtures/nfts'
import { DEMO_USERS, demoWallets, toPublicUser } from '@/mocks/fixtures/users'
import { hashPassword, verifyPassword } from '@/mocks/lib/password'
import { setScenario as persistScenario, resetScenarioRuntime } from '@/mocks/scenarios'
import { publish, clearEvents } from '@/mocks/events'

let activeScenario: ScenarioId = 'default'

export function setActiveScenario(scenario: ScenarioId) {
  activeScenario = scenario
}

export function getActiveScenario(): ScenarioId {
  return activeScenario
}

const PERSIST_KEY = 'kurio:mock-store-v3'
const SCHEMA = 3
const timers = new Map<string, ReturnType<typeof setTimeout>>()
const GLOBAL_KEY = '__KURIO_MOCK_STATE__'

type Account = {
  user: User
  passwordHash: string
}

type StoreState = {
  schema: number
  quotes: Record<string, { ownerId: string; quote: Quote; usedBy?: string }>
  settlements: Record<string, { at: number; outcome: 'confirmed' | 'rejected' }>
  networkFeeEth: string

  nfts: Nft[]
  accounts: Account[]
  sessions: Record<string, { userId: string; expiresAt: string }>
  carts: Record<string, Cart>
  favorites: Record<string, Favorite[]>
  wallets: Record<string, Wallet[]>
  orders: Record<string, Order>
  idempotency: Record<string, { bodyHash: string; orderId: string }>
  coupons: Record<string, { discountPct: number; expiresAt: string }>
}

declare global {
  // eslint-disable-next-line no-var
  var __KURIO_MOCK_STATE__: StoreState | undefined
}

function cloneNfts(): Nft[] {
  return structuredClone(nftFixtures)
}

function emptyCart(id: string): Cart {
  return { id, revision: 1, items: [], couponCode: null, updatedAt: new Date().toISOString() }
}

function buildInitial(): StoreState {
  return {
    schema: SCHEMA, quotes: {}, settlements: {}, networkFeeEth: '0.0025',
    nfts: cloneNfts(),
    accounts: DEMO_USERS.map((u) => ({
      user: toPublicUser(u),
      passwordHash: u.passwordHash,
    })),
    sessions: {},
    carts: {},
    favorites: { user_alice: [], user_bob: [] },
    wallets: structuredClone(demoWallets),
    orders: {},
    idempotency: {},
    coupons: {
      MINT10: {
        discountPct: 10,
        expiresAt: '2099-01-01T00:00:00.000Z',
      },
      EXPIRED: {
        discountPct: 15,
        expiresAt: '2020-01-01T00:00:00.000Z',
      },
    },
  }
}

function normalizeUser(user: User): User {
  const handle =
    user.username ||
    user.name.trim().toLowerCase().replace(/\s+/g, '.').slice(0, 24) ||
    'colecionador'
  return {
    ...user,
    username: handle,
    ensName: user.ensName ?? null,
    ensTld: user.ensTld || '.eth',
    walletNickname: user.walletNickname ?? null,
    avatarUrl: user.avatarUrl ?? null,
  }
}

function normalizeState(s: StoreState): StoreState {
  s.accounts = s.accounts.map((a) => ({ ...a, user: normalizeUser(a.user) }))
  return s
}

function load(): StoreState {
  // Handlers execute in the page; persisted state restores the next page instance.
  if (globalThis[GLOBAL_KEY as '__KURIO_MOCK_STATE__']) {
    return normalizeState(globalThis[GLOBAL_KEY as '__KURIO_MOCK_STATE__']!)
  }
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(PERSIST_KEY)
      if (raw && (JSON.parse(raw) as StoreState).schema === SCHEMA) {
        const parsed = normalizeState(JSON.parse(raw) as StoreState)
        globalThis[GLOBAL_KEY as '__KURIO_MOCK_STATE__'] = parsed
        return parsed
      }
    }
  } catch {
    // ignore
  }
  // The old schema has no order ownership: intentionally reset only our data.
  if (typeof localStorage !== 'undefined') {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('kurio:') && !['kurio:scenario', 'kurio:deterministic'].includes(key)) localStorage.removeItem(key)
    }
  }
  const initial = buildInitial()
  globalThis[GLOBAL_KEY as '__KURIO_MOCK_STATE__'] = initial
  return initial
}

function save(next: StoreState) {
  globalThis[GLOBAL_KEY as '__KURIO_MOCK_STATE__'] = next
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PERSIST_KEY, JSON.stringify(next))
    }
  } catch {
    // Storage may be unavailable; this page can still use the in-memory mock.
  }
}

let state = load()

export const mockStore = {
  reset() {
    resetScenarioRuntime()
    if (typeof sessionStorage !== 'undefined') for (const key of Object.keys(sessionStorage)) if (key.startsWith('kurio:')) sessionStorage.removeItem(key)
    for (const timer of timers.values()) clearTimeout(timer)
    timers.clear()
    clearEvents()
    activeScenario = 'default'
    if (typeof localStorage !== 'undefined') {
      for (const key of Object.keys(localStorage)) if (key.startsWith('kurio:') && key !== 'kurio:deterministic') localStorage.removeItem(key)
    }
    state = buildInitial()
    save(state)
  },

  getScenario(): ScenarioId {
    return activeScenario
  },

  persist() {
    save(state)
  },

  getNfts() {
    if (activeScenario === 'empty') return []
    return state.nfts
  },

  getNft(id: string) {
    return state.nfts.find((n) => n.id === id || n.slug === id)
  },

  bumpNft(id: string, patch: Partial<Nft> & { editionId?: string; available?: number; priceEth?: string }) {
    const nft = state.nfts.find((n) => n.id === id)
    if (!nft) return null
    nft.version += 1
    if (patch.editionId) {
      const ed = nft.editions.find((e) => e.id === patch.editionId)
      if (ed) {
        if (patch.available !== undefined) ed.available = patch.available
        if (patch.priceEth !== undefined) ed.priceEth = patch.priceEth
      }
    }
    // Administrative controls cannot override resource identity or version.
    if (patch.priceEth !== undefined && !patch.editionId) nft.editions[0]!.priceEth = patch.priceEth
    if (patch.available !== undefined && !patch.editionId) nft.editions[0]!.available = patch.available
    save(state)
    this.emitNft(nft, patch.editionId)
    return nft
  },

  findAccountByEmail(email: string) {
    return state.accounts.find((a) => a.user.email.toLowerCase() === email.toLowerCase())
  },

  findAccountById(id: string) {
    return state.accounts.find((a) => a.user.id === id)
  },

  async register(input: { email: string; name: string; password: string }) {
    if (this.findAccountByEmail(input.email)) {
      return { error: 'CONFLICT' as const }
    }
    const user: User = {
      id: `user_${crypto.randomUUID().slice(0, 8)}`,
      email: input.email,
      name: input.name,
      username: input.name.trim().toLowerCase().replace(/\s+/g, '.').slice(0, 24) || 'colecionador',
      ensName: null,
      ensTld: '.eth',
      walletNickname: null,
      avatarUrl: null,
      createdAt: new Date().toISOString(),
    }
    const passwordHash = await hashPassword(input.password)
    state.accounts.push({ user, passwordHash })
    state.favorites[user.id] = []
    state.wallets[user.id] = []
    save(state)
    return { user }
  },

  createSession(userId: string): Session {
    const account = this.findAccountById(userId)!
    const token = `tok_${crypto.randomUUID()}`
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString()
    if (activeScenario === 'session-expired') {
      const past = new Date(Date.now() - 1000).toISOString()
      state.sessions[token] = { userId, expiresAt: past }
      save(state)
      return { token, user: account.user, expiresAt: past }
    }
    state.sessions[token] = { userId, expiresAt }
    save(state)
    return { token, user: account.user, expiresAt }
  },

  getSession(token: string | null): Session | null {
    if (!token) return null
    const s = state.sessions[token]
    if (!s) return null
    if (activeScenario === 'session-expired') { s.expiresAt = new Date(Date.now() - 1).toISOString(); save(state) }
    if (new Date(s.expiresAt).getTime() < Date.now()) {
      return null
    }
    const account = this.findAccountById(s.userId)
    if (!account) return null
    return { token, user: account.user, expiresAt: s.expiresAt }
  },

  logout(token: string) {
    delete state.sessions[token]
    save(state)
  },

  cartKey(ownerId: string) {
    return ownerId
  },

  getCart(ownerId: string): Cart {
    const key = this.cartKey(ownerId)
    if (!state.carts[key]) {
      state.carts[key] = emptyCart(`cart_${key}`)
      save(state)
    }
    return state.carts[key]!
  },

  setCart(ownerId: string, cart: Cart, changed = false) {
    if (changed) { cart.revision += 1; cart.updatedAt = new Date().toISOString() }
    state.carts[this.cartKey(ownerId)] = cart
    save(state)
  },

  mergeGuestCart(guestId: string, userId: string) {
    if (!/^guest_[\w-]+$/.test(guestId)) return []
    const guest = this.getCart(guestId)
    const user = this.getCart(userId)
    if (!guest.items.length && !guest.couponCode) return []
    for (const item of guest.items) {
      const existing = user.items.find(
        (i) => i.nftId === item.nftId && i.editionId === item.editionId,
      )
      if (existing) {
        existing.quantity += item.quantity
      } else {
        user.items.push({ ...item, id: `ci_${crypto.randomUUID().slice(0, 8)}` })
      }
    }
    user.couponCode = user.couponCode ?? guest.couponCode
    user.updatedAt = new Date().toISOString()
    guest.items = []
    guest.couponCode = null
    const before = structuredClone(user.items)
    this.syncCartPrices(user)
    const adjustments = user.items.filter(i => { const old = before.find(b => b.id === i.id)!; return i.quantity > i.available || i.unitPriceEth !== old.unitPriceEth }).map(i => `${i.nftName}: preço ou quantidade ajustado à disponibilidade atual`)
    user.items = user.items.map(i => ({ ...i, quantity: Math.min(i.quantity, i.available) })).filter(i => i.quantity > 0)
    this.setCart(userId, user, true)
    this.setCart(guestId, guest, true)
    return adjustments
  },

  syncCartPrices(cart: Cart) {
    for (const item of cart.items) {
      const nft = this.getNft(item.nftId)
      const ed = nft?.editions.find((e) => e.id === item.editionId)
      if (nft && ed) {
        item.unitPriceEth = ed.priceEth
        item.available = ed.available
        item.nftName = nft.name
        item.imageUrl = nft.imageUrl
        item.editionLabel = ed.label
      }
    }
  },

  addCartItem(
    ownerId: string,
    input: { nftId: string; editionId: string; quantity: number },
  ): CartItem | { error: 'NOT_FOUND' | 'GONE' } {
    const nft = this.getNft(input.nftId)
    const ed = nft?.editions.find((e) => e.id === input.editionId)
    if (!nft || !ed) return { error: 'NOT_FOUND' }
    if (ed.available < 1) return { error: 'GONE' }
    const cart = this.getCart(ownerId)
    const qty = Math.min(input.quantity, ed.available)
    const existing = cart.items.find(
      (i) => i.nftId === input.nftId && i.editionId === input.editionId,
    )
    if (existing) {
      existing.quantity = Math.min(ed.available, existing.quantity + qty)
      existing.unitPriceEth = ed.priceEth
      existing.available = ed.available
    } else {
      cart.items.push({
        id: `ci_${crypto.randomUUID().slice(0, 8)}`,
        nftId: nft.id,
        editionId: ed.id,
        quantity: qty,
        unitPriceEth: ed.priceEth,
        nftName: nft.name,
        editionLabel: ed.label,
        imageUrl: nft.imageUrl,
        available: ed.available,
      })
    }
    cart.updatedAt = new Date().toISOString()
    this.setCart(ownerId, cart, true)
    return cart.items.find((i) => i.nftId === nft.id && i.editionId === ed.id)!
  },

  quote(ownerId: string, couponCode?: string | null, walletId?: string, network?: string, persist = true): Quote {
    const cart = this.getCart(ownerId)
    this.syncCartPrices(cart)
    const code = (couponCode === undefined ? cart.couponCode : couponCode)?.trim().toUpperCase() || null
    const coupon = code ? state.coupons[code] : undefined
    const couponValid = !code || Boolean(coupon && new Date(coupon.expiresAt).getTime() > Date.now() && !['coupon-invalid', 'coupon-expired'].includes(activeScenario))
    const items = cart.items.map(item => ({
      cartItemId: item.id, nftId: item.nftId, editionId: item.editionId,
      quantity: item.quantity, unitPriceEth: item.unitPriceEth,
      lineTotalEth: mulEth(item.unitPriceEth, item.quantity), available: item.available,
    }))
    const subtotalEth = items.reduce((acc, item) => addEth(acc, item.lineTotalEth), '0')
    const discountEth = couponValid && coupon ? eth(subtotalEth).times(coupon.discountPct).div(100).toFixed() : '0'
    const networkFeeEth = items.length ? state.networkFeeEth : '0'
    const totalEth = eth(subtotalEth).minus(discountEth).plus(networkFeeEth).toFixed()
    if (persist && couponValid && cart.couponCode !== code) {
      cart.couponCode = code
      this.setCart(ownerId, cart, true)
    }
    const wallet = walletId ? this.getWallets(ownerId).find(w => w.id === walletId) : null
    const revision = JSON.stringify({ cartRevision: cart.revision, items, code, couponValid, discountEth, networkFeeEth, wallet, network })
    const quote: Quote = {
      quoteId: `quo_${crypto.randomUUID()}`, cartRevision: cart.revision, revision,
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      walletId: walletId ?? null, network: network ?? null,
      subtotalEth, discountEth, networkFeeEth, totalEth, couponCode: code,
      couponValid, couponMessage: couponValid ? null : 'Cupom inválido ou expirado',
      stale: false, quotedAt: new Date().toISOString(), items,
    }
    if (persist) {
      state.quotes[quote.quoteId] = { ownerId, quote }
      save(state)
    }
    return quote
  },

  setNetworkFee(value: string) {
    state.networkFeeEth = eth(value).toFixed()
    save(state)
  },

  getFavorites(userId: string) {
    return state.favorites[userId] ?? []
  },

  toggleFavorite(userId: string, nftId: string, add: boolean) {
    const list = state.favorites[userId] ?? (state.favorites[userId] = [])
    if (add) {
      if (!list.some((f) => f.nftId === nftId)) {
        list.push({ nftId, createdAt: new Date().toISOString() })
      }
    } else {
      state.favorites[userId] = list.filter((f) => f.nftId !== nftId)
    }
    save(state)
    return state.favorites[userId]!
  },

  getWallets(userId: string) {
    return state.wallets[userId] ?? []
  },

  upsertWallet(userId: string, wallet: Omit<Wallet, 'id'> & { id?: string }) {
    const list = state.wallets[userId] ?? (state.wallets[userId] = [])
    if (wallet.isPrimary) {
      for (const w of list) w.isPrimary = false
    }
    if (wallet.id) {
      const idx = list.findIndex((w) => w.id === wallet.id)
      if (idx >= 0) {
        list[idx] = { ...list[idx]!, ...wallet, id: wallet.id }
        save(state)
        return list[idx]!
      }
    }
    const created: Wallet = {
      id: `wal_${crypto.randomUUID().slice(0, 8)}`,
      label: wallet.label,
      address: wallet.address,
      network: wallet.network,
      displayName: wallet.displayName ?? null,
      profileName: wallet.profileName ?? null,
      secondaryRef: wallet.secondaryRef ?? null,
      walletType: wallet.walletType ?? null,
      referralCode: wallet.referralCode ?? null,
      email: wallet.email ?? null,
      ensName: wallet.ensName ?? null,
      ensTld: wallet.ensTld ?? '.eth',
      isPrimary: wallet.isPrimary || list.length === 0,
    }
    list.push(created)
    save(state)
    return created
  },

  updateProfile(
    userId: string,
    patch: Partial<
      Pick<User, 'name' | 'username' | 'ensName' | 'ensTld' | 'walletNickname' | 'avatarUrl'>
    >,
  ) {
    const account = this.findAccountById(userId)
    if (!account) return null
    Object.assign(account.user, patch)
    save(state)
    return account.user
  },

  async changePassword(userId: string, current: string, next: string) {
    const account = this.findAccountById(userId)
    if (!account) return { error: 'NOT_FOUND' as const }
    if (!(await verifyPassword(current, account.passwordHash))) {
      return { error: 'VALIDATION' as const }
    }
    account.passwordHash = await hashPassword(next)
    save(state)
    return { ok: true as const }
  },

  createOrder(userId: string, idempotencyKey: string, body: CreateOrderInput) {
    this.reconcileOrders()
    const key = `${userId}:${idempotencyKey}`
    const bodyHash = JSON.stringify({ quoteId: body.quoteId, collectorName: body.collectorName.trim(),
      collectorEmail: body.collectorEmail.trim(), collectorUsername: body.collectorUsername ?? '',
      notes: body.notes ?? '', walletId: body.walletId, network: body.network })
    const existing = state.idempotency[key]
    if (existing) {
      if (existing.bodyHash !== bodyHash) return { error: 'IDEMPOTENCY_CONFLICT' as const }
      return { order: state.orders[existing.orderId]!, reused: true }
    }
    const saved = state.quotes[body.quoteId]
    if (!saved || saved.ownerId !== userId || saved.usedBy) return { error: 'QUOTE_CHANGED' as const }
    const wallet = this.getWallets(userId).find(w => w.id === body.walletId)
    if (!wallet || wallet.network !== body.network) return { error: 'FORBIDDEN' as const }
    const current = this.quote(userId, saved.quote.couponCode, body.walletId, body.network, false)
    if (saved.quote.revision !== current.revision || new Date(saved.quote.expiresAt).getTime() <= Date.now()) return { error: 'QUOTE_CHANGED' as const }
    if (!current.couponValid || !current.items.length || current.items.some(i => !Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > i.available)) return { error: 'CONFLICT' as const }
    const id = `ord_${crypto.randomUUID().slice(0, 10)}`
    const now = new Date().toISOString()
    const cart = this.getCart(userId)
    const order: Order = {
      id, userId, quoteId: saved.quote.quoteId, walletSnapshot: structuredClone(wallet),
      status: 'pending', version: 1, idempotencyKey, txRef: null, explorerUrl: null,
      collectorName: body.collectorName, collectorEmail: body.collectorEmail,
      collectorUsername: body.collectorUsername ?? '', notes: body.notes ?? '',
      walletId: wallet.id, network: body.network,
      items: current.items.map(qi => {
        const ci = cart.items.find(c => c.id === qi.cartItemId)!
        return { cartItemId: ci.id, nftId: qi.nftId, editionId: qi.editionId,
          nftName: ci.nftName, editionLabel: ci.editionLabel, imageUrl: ci.imageUrl,
          quantity: qi.quantity, unitPriceEth: qi.unitPriceEth, lineTotalEth: qi.lineTotalEth }
      }),
      subtotalEth: current.subtotalEth, discountEth: current.discountEth,
      networkFeeEth: current.networkFeeEth, totalEth: current.totalEth, couponCode: current.couponCode,
      createdAt: now, updatedAt: now, rejectionReason: null,
    }
    state.orders[id] = order
    state.idempotency[key] = { bodyHash, orderId: id }
    saved.usedBy = id
    state.settlements[id] = { at: Date.now() + (activeScenario === 'order-timeout' ? 12_000 : 1500), outcome: activeScenario === 'payment-rejected' ? 'rejected' : 'confirmed' }
    // Reserve synchronously; available is unreserved stock. No await within this transaction.
    for (const item of order.items) {
      const nft = this.getNft(item.nftId)!
      const ed = nft.editions.find(e => e.id === item.editionId)!
      ed.available -= item.quantity
      nft.version += 1
    }
    save(state)
    for (const item of order.items) this.emitNft(this.getNft(item.nftId)!, item.editionId)
    this.emitOrder(order)
    this.scheduleOrder(id)
    return { order, reused: false }
  },

  scheduleOrder(id: string) {
    const settlement = state.settlements[id]
    if (!settlement || state.orders[id]?.status !== 'pending' || timers.has(id)) return
    timers.set(id, setTimeout(() => {
      timers.delete(id)
      this.settleOrder(id)
    }, Math.max(0, settlement.at - Date.now())))
  },

  reconcileOrders() {
    for (const [id, settlement] of Object.entries(state.settlements)) {
      if (state.orders[id]?.status !== 'pending') continue
      if (settlement.at <= Date.now()) this.settleOrder(id)
      else this.scheduleOrder(id)
    }
  },

  settleOrder(id: string, forced?: 'confirmed' | 'rejected') {
    const order = state.orders[id]
    const settlement = state.settlements[id]
    if (!order || order.status !== 'pending' || !settlement) return order
    if (!forced && settlement.at > Date.now()) return order
    order.status = forced ?? settlement.outcome
    order.version += 1
    order.updatedAt = new Date().toISOString()
    if (order.status === 'confirmed') {
      order.txRef = `0x${crypto.randomUUID().replace(/-/g, '')}`
      order.explorerUrl = null // The receipt explains this is a simulated transaction.
      const cart = this.getCart(order.userId)
      for (const item of order.items) {
        const current = cart.items.find(i => i.id === item.cartItemId && i.nftId === item.nftId && i.editionId === item.editionId)
        if (current) current.quantity = Math.max(0, current.quantity - item.quantity)
      }
      cart.items = cart.items.filter(i => i.quantity > 0)
      if (!cart.items.length) cart.couponCode = null
      this.setCart(order.userId, cart, true)
    } else {
      order.rejectionReason = 'Pagamento recusado pela rede simulada'
      for (const item of order.items) {
        const ed = this.getNft(item.nftId)?.editions.find(e => e.id === item.editionId)
        if (ed) ed.available += item.quantity
      }
    }
    for (const item of order.items) { const nft = this.getNft(item.nftId); if (nft) nft.version += 1 }
    const timer = timers.get(id)
    if (timer) clearTimeout(timer)
    timers.delete(id)
    delete state.settlements[id]
    save(state)
    for (const item of order.items) this.emitNft(this.getNft(item.nftId)!, item.editionId)
    this.emitOrder(order)
    return order
  },

  getOrder(id: string) { this.reconcileOrders(); return state.orders[id] },
  getOrderByIdempotency(userId: string, key: string) {
    this.reconcileOrders()
    const ref = state.idempotency[`${userId}:${key}`]
    return ref ? state.orders[ref.orderId] : undefined
  },
  emitNft(nft: Nft, editionId?: string) {
    const ed = nft.editions.find(e => e.id === editionId) ?? nft.editions[0]!
    publish({ type: 'nft.updated', eventId: crypto.randomUUID(), id: nft.id, version: nft.version,
      editionId: ed.id, priceEth: ed.priceEth, available: ed.available, at: new Date().toISOString() })
  },
  emitOrder(order: Order) {
    publish({ type: 'order.updated', eventId: crypto.randomUUID(), userId: order.userId,
      id: order.id, version: order.version, status: order.status, txRef: order.txRef,
      rejectionReason: order.rejectionReason, at: new Date().toISOString() })
  },
}

mockStore.reconcileOrders()

declare global {
  interface Window {
    __KURIO_RESET__?: () => void
    __KURIO_SET_SCENARIO__?: (id: ScenarioId) => void
    __KURIO_EMIT_NFT__?: (
      nftId: string,
      overrides?: Partial<Omit<NftUpdatedEvent, 'type' | 'id'>>,
    ) => void
    __KURIO_EMIT_ORDER__?: (
      orderId: string,
      overrides?: Partial<Omit<OrderUpdatedEvent, 'type' | 'id'>>,
    ) => void
    __KURIO_SOCKET__?: {
      disconnect: () => void
      connect: () => void
      emit: (event: string, payload?: unknown) => void
      connected?: boolean
    } | null

  }
}


if (typeof window !== 'undefined') {
  window.__KURIO_RESET__ = () => mockStore.reset()
  window.__KURIO_SET_SCENARIO__ = (id: ScenarioId) => {
    persistScenario(id)
    setActiveScenario(id)
  }
}

