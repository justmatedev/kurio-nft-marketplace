import { http, HttpResponse, delay } from 'msw'
import { mockStore, setActiveScenario } from '@/mocks/store'
import { verifyPassword } from '@/mocks/lib/password'
import {
  getScenarioFromRequest,
  runScenarioOnce,
  scenarioLatencyMs,
  shouldFailTransient,
} from '@/mocks/scenarios'
import type { ApiErrorBody, Nft, NftListParams, Wallet } from '@/shared/api/types'
import { eth } from '@/shared/lib/eth'
import { eventHistory, replay } from '@/mocks/events'
import { loginSchema, profileSchema, changePasswordSchema, registerSchema, orderSchema, quantitySchema, walletSchema, validationFields } from '@/shared/api/validation'

const API = '/api'

function err(status: number, body: ApiErrorBody) {
  return HttpResponse.json(body, { status })
}

async function maybeDelay(request?: Request) {
  const scenario = getScenarioFromRequest(request)
  setActiveScenario(scenario)
  const url = request ? new URL(request.url) : null
  const latency = scenario === 'out-of-order' && url?.pathname === '/api/nfts'
    ? (url.searchParams.get('q') === 'Ape' ? 1200 : 50) : scenarioLatencyMs(scenario)
  await delay(latency)
  setActiveScenario(scenario)
  mockStore.reconcileOrders()
  if (scenario === 'network-error') return HttpResponse.error()
  if (request?.headers.has('Authorization') && ['/api/cart', '/api/quote'].some(p => url?.pathname.startsWith(p)) && !authUser(request)) {
    return err(401, { code: 'UNAUTHORIZED', message: 'Sessão expirada' })
  }
  if (shouldFailTransient(scenario)) {
    return err(503, { code: 'TRANSIENT', message: 'Falha transitória simulada' })
  }
  return null
}

function authUser(request: Request) {
  const header = request.headers.get('Authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  const session = mockStore.getSession(token)
  return session
}

function listNfts(params: NftListParams) {
  let items = [...mockStore.getNfts()]
  if (params.q) {
    const q = params.q.toLowerCase()
    items = items.filter(
      (n) =>
        n.name.toLowerCase().includes(q) ||
        n.collection.toLowerCase().includes(q) ||
        n.tags.some((t) => t.includes(q)),
    )
  }
  if (params.collection) {
    items = items.filter((n) => n.collection === params.collection)
  }
  if (params.network) {
    items = items.filter((n) => n.network === params.network)
  }
  if (params.minPrice) {
    items = items.filter((n) => eth(n.editions[0]!.priceEth).gte(params.minPrice!))
  }
  if (params.maxPrice) {
    items = items.filter((n) => eth(n.editions[0]!.priceEth).lte(params.maxPrice!))
  }
  switch (params.sort) {
    case 'price_asc':
      items.sort((a, b) => eth(a.editions[0]!.priceEth).cmp(b.editions[0]!.priceEth))
      break
    case 'price_desc':
      items.sort((a, b) => eth(b.editions[0]!.priceEth).cmp(a.editions[0]!.priceEth))
      break
    case 'oldest':
      items.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      break
    case 'newest':
    default:
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 12
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = (page - 1) * pageSize
  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    total,
    totalPages,
  }
}

function ownerFrom(request: Request) {
  const session = authUser(request)
  if (session) return { ownerId: session.user.id, session }
  const suppliedGuest = request.headers.get('X-Guest-Id') ?? ''
  const guestId = /^guest_[\w-]+$/.test(suppliedGuest) ? suppliedGuest : 'guest_anon'
  return { ownerId: guestId, session: null }
}

export const restHandlers = [
  http.post(`${API}/dev/reset`, async () => {
    mockStore.reset()
    return HttpResponse.json({ ok: true })
  }),

  http.post(`${API}/dev/emit-nft`, async ({ request }) => {
    const body = await request.json() as { nftId: string; overrides?: { editionId?: string; priceEth?: string; available?: number } }
    const nft = mockStore.getNft(body.nftId)
    if (!nft) return err(404, { code: 'NOT_FOUND', message: 'NFT não encontrado' })
    const patch = body.overrides ?? {}
    if (patch.priceEth !== undefined && (!/^\d+(\.\d+)?$/.test(patch.priceEth))) return err(400, { code: 'VALIDATION', message: 'Preço inválido' })
    if (patch.available !== undefined && (!Number.isInteger(patch.available) || patch.available < 0)) return err(400, { code: 'VALIDATION', message: 'Disponibilidade inválida' })
    mockStore.bumpNft(nft.id, { editionId: patch.editionId ?? nft.editions[0]!.id, priceEth: patch.priceEth, available: patch.available })
    return HttpResponse.json({ ok: true })
  }),
  http.post(`${API}/dev/emit-order`, async ({ request }) => {
    const body = await request.json() as { orderId: string; overrides?: { status?: string } }
    const order = mockStore.getOrder(body.orderId)
    if (!order) return err(404, { code: 'NOT_FOUND', message: 'Pedido não encontrado' })
    if (body.overrides?.status === 'confirmed' || body.overrides?.status === 'rejected') mockStore.settleOrder(order.id, body.overrides.status)
    else mockStore.emitOrder(order)
    return HttpResponse.json({ ok: true })
  }),
  http.get(`${API}/dev/events`, () => HttpResponse.json({ items: eventHistory() })),
  http.post(`${API}/dev/replay`, async ({ request }) => {
    const { eventId } = await request.json() as { eventId: string }
    return HttpResponse.json({ ok: replay(eventId) })
  }),
  http.post(`${API}/dev/fee`, async ({ request }) => {
    const { fee } = await request.json() as { fee: string }
    if (!/^\d+(\.\d+)?$/.test(fee)) return err(400, { code: 'VALIDATION', message: 'Taxa inválida' })
    mockStore.setNetworkFee(fee)
    return HttpResponse.json({ ok: true })
  }),

  http.get(`${API}/catalog/meta`, async ({ request }) => {
    const failed = await maybeDelay(request)
    if (failed) return failed
    const nfts = mockStore.getNfts()
    const collections: Record<string, number> = {}
    const networks: Record<string, number> = {}
    for (const nft of nfts) {
      collections[nft.collection] = (collections[nft.collection] ?? 0) + 1
      networks[nft.network] = (networks[nft.network] ?? 0) + 1
    }
    const images = new Set<string>()
    const featured = [...nfts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).filter(nft => {
      if (images.has(nft.imageUrl)) return false
      images.add(nft.imageUrl)
      return true
    }).slice(0, 4)
    return HttpResponse.json({ collections, networks, featured })
  }),

  http.get(`${API}/nfts`, async ({ request }) => {
    const failed = await maybeDelay(request)
    if (failed) return failed
    if (getScenarioFromRequest(request) === 'catalog-error') {
      return err(503, { code: 'TRANSIENT', message: 'Falha ao carregar o catálogo' })
    }
    const url = new URL(request.url)
    const result = listNfts({
      q: url.searchParams.get('q') ?? undefined,
      collection: url.searchParams.get('collection') ?? undefined,
      network: url.searchParams.get('network') ?? undefined,
      minPrice: url.searchParams.get('minPrice') ?? undefined,
      maxPrice: url.searchParams.get('maxPrice') ?? undefined,
      sort: (url.searchParams.get('sort') as NftListParams['sort']) ?? 'newest',
      page: Number(url.searchParams.get('page') ?? 1),
      pageSize: Number(url.searchParams.get('pageSize') ?? 12),
    })
    return HttpResponse.json(result)
  }),

  http.get(`${API}/nfts/:id`, async ({ request, params }) => {
    const failed = await maybeDelay(request)
    if (failed) return failed
    const nft = mockStore.getNft(String(params.id))
    if (!nft) return err(404, { code: 'NOT_FOUND', message: 'NFT não encontrado' })
    return HttpResponse.json(nft satisfies Nft)
  }),

  http.post(`${API}/auth/register`, async ({ request }) => {
    const failed = await maybeDelay(request)
    if (failed) return failed
    const parsed = registerSchema.safeParse(await request.json())
    if (!parsed.success) return err(400, { code: 'VALIDATION', message: 'Dados inválidos', fields: validationFields(parsed.error) })
    const body = parsed.data
    const result = await mockStore.register({
      email: body.email!,
      name: body.name!,
      password: body.password!,
    })
    if ('error' in result) {
      return err(409, {
        code: 'CONFLICT',
        message: 'E-mail já cadastrado',
        fields: { email: 'E-mail já em uso' },
      })
    }
    const session = mockStore.createSession(result.user.id)
    session.cartAdjustments = mockStore.mergeGuestCart(body.guestId ?? request.headers.get('X-Guest-Id') ?? 'guest_anon', result.user.id)
    return HttpResponse.json(session, { status: 201 })
  }),

  http.post(`${API}/auth/login`, async ({ request }) => {
    const failed = await maybeDelay(request)
    if (failed) return failed
    const parsed = loginSchema.safeParse(await request.json())
    if (!parsed.success) return err(400, { code: 'VALIDATION', message: 'Dados inválidos', fields: validationFields(parsed.error) })
    const body = parsed.data
    const account = body.email ? mockStore.findAccountByEmail(body.email) : null
    if (!account || !body.password || !(await verifyPassword(body.password, account.passwordHash))) {
      return err(401, { code: 'UNAUTHORIZED', message: 'Credenciais inválidas' })
    }
    const session = mockStore.createSession(account.user.id)
    if (body.guestId) session.cartAdjustments = mockStore.mergeGuestCart(body.guestId, account.user.id)
    return HttpResponse.json(session)
  }),

  http.get(`${API}/auth/session`, async ({ request }) => {
    const failed = await maybeDelay(request)
    if (failed) return failed
    const session = authUser(request)
    if (!session) return err(401, { code: 'UNAUTHORIZED', message: 'Sessão inválida' })
    return HttpResponse.json(session)
  }),

  http.post(`${API}/auth/logout`, async ({ request }) => {
    const header = request.headers.get('Authorization')
    const token = header?.startsWith('Bearer ') ? header.slice(7) : ''
    if (token) mockStore.logout(token)
    return HttpResponse.json({ ok: true })
  }),

  http.get(`${API}/favorites`, async ({ request }) => {
    const failed = await maybeDelay(request)
    if (failed) return failed
    const session = authUser(request)
    if (!session) return err(401, { code: 'UNAUTHORIZED', message: 'Login necessário' })
    return HttpResponse.json({ items: mockStore.getFavorites(session.user.id) })
  }),

  http.post(`${API}/favorites/:nftId`, async ({ request, params }) => {
    const failed = await maybeDelay(request)
    if (failed) return failed
    const session = authUser(request)
    if (!session) return err(401, { code: 'UNAUTHORIZED', message: 'Login necessário' })
    if (getScenarioFromRequest(request) === 'favorites-fail') {
      return err(503, { code: 'TRANSIENT', message: 'Não foi possível atualizar favoritos' })
    }
    const items = mockStore.toggleFavorite(session.user.id, String(params.nftId), true)
    return HttpResponse.json({ items }, { status: 201 })
  }),

  http.delete(`${API}/favorites/:nftId`, async ({ request, params }) => {
    const failed = await maybeDelay(request)
    if (failed) return failed
    const session = authUser(request)
    if (!session) return err(401, { code: 'UNAUTHORIZED', message: 'Login necessário' })
    if (getScenarioFromRequest(request) === 'favorites-fail') {
      return err(503, { code: 'TRANSIENT', message: 'Não foi possível atualizar favoritos' })
    }
    const items = mockStore.toggleFavorite(session.user.id, String(params.nftId), false)
    return HttpResponse.json({ items })
  }),

  http.get(`${API}/cart`, async ({ request }) => {
    const failed = await maybeDelay(request)
    if (failed) return failed
    const { ownerId } = ownerFrom(request)
    const cart = mockStore.getCart(ownerId)
    mockStore.syncCartPrices(cart)
    mockStore.setCart(ownerId, cart)
    return HttpResponse.json(cart)
  }),

  http.post(`${API}/cart/items`, async ({ request }) => {
    const failed = await maybeDelay(request)
    if (failed) return failed
    const { ownerId } = ownerFrom(request)
    const body = (await request.json()) as {
      nftId: string
      editionId: string
      quantity: number
    }
    if (!quantitySchema.safeParse(body.quantity).success) return err(400, { code: 'VALIDATION', message: 'Quantidade deve ser inteira e positiva' })
    const result = mockStore.addCartItem(ownerId, body)
    if ('error' in result) {
      if (result.error === 'NOT_FOUND') {
        return err(404, { code: 'NOT_FOUND', message: 'Edição não encontrada' })
      }
      return err(410, { code: 'GONE', message: 'Edição esgotada' })
    }
    return HttpResponse.json(mockStore.getCart(ownerId), { status: 201 })
  }),

  http.patch(`${API}/cart/items/:id`, async ({ request, params }) => {
    const failed = await maybeDelay(request)
    if (failed) return failed
    const { ownerId } = ownerFrom(request)
    const body = (await request.json()) as { quantity: number }
    const cart = mockStore.getCart(ownerId)
    const item = cart.items.find((i) => i.id === params.id)
    if (!item) return err(404, { code: 'NOT_FOUND', message: 'Item não encontrado' })
    mockStore.syncCartPrices(cart)
    if (!quantitySchema.safeParse(body.quantity).success) return err(400, { code: 'VALIDATION', message: 'Quantidade deve ser inteira e positiva' })
    if (body.quantity > item.available) return err(409, { code: 'CONFLICT', message: 'Disponibilidade insuficiente' })
    item.quantity = body.quantity
    cart.updatedAt = new Date().toISOString()
    mockStore.setCart(ownerId, cart, true)
    return HttpResponse.json(cart)
  }),

  http.delete(`${API}/cart/items/:id`, async ({ request, params }) => {
    const failed = await maybeDelay(request)
    if (failed) return failed
    const { ownerId } = ownerFrom(request)
    const cart = mockStore.getCart(ownerId)
    cart.items = cart.items.filter((i) => i.id !== params.id)
    cart.updatedAt = new Date().toISOString()
    mockStore.setCart(ownerId, cart, true)
    return HttpResponse.json(cart)
  }),

  http.post(`${API}/quote`, async ({ request }) => {
    const failed = await maybeDelay(request)
    if (failed) return failed
    const { ownerId } = ownerFrom(request)
    const body = (await request.json().catch(() => ({}))) as { couponCode?: string | null; walletId?: string; network?: string }
    const quote = mockStore.quote(ownerId, body.couponCode, body.walletId, body.network)
    if (body.couponCode && !quote.couponValid) {
      return err(400, {
        code: 'VALIDATION',
        message: quote.couponMessage ?? 'Cupom inválido',
        fields: { couponCode: quote.couponMessage ?? 'Inválido' },
      })
    }
    const scenario = getScenarioFromRequest(request)
    if (body.walletId && quote.items.length && ['price-changed', 'sold-out'].includes(scenario)) {
      const item = quote.items[0]!
      runScenarioOnce(`${scenario}:${ownerId}`, () => mockStore.bumpNft(item.nftId, {
        editionId: item.editionId,
        ...(scenario === 'sold-out' ? { available: 0 } : { priceEth: eth(item.unitPriceEth).plus('0.01').toFixed() }),
      }))
    }
    return HttpResponse.json(quote)
  }),

  http.post(`${API}/orders`, async ({ request }) => {
    const failed = await maybeDelay(request)
    if (failed) return failed
    const session = authUser(request)
    if (!session) return err(401, { code: 'UNAUTHORIZED', message: 'Login necessário' })
    const idempotencyKey = request.headers.get('Idempotency-Key')
    if (!idempotencyKey) {
      return err(400, { code: 'VALIDATION', message: 'Idempotency-Key obrigatória' })
    }
    const parsed = orderSchema.safeParse(await request.json())
    if (!parsed.success) return err(400, { code: 'VALIDATION', message: 'Dados inválidos', fields: validationFields(parsed.error) })
    const result = mockStore.createOrder(session.user.id, idempotencyKey, parsed.data)
    if (result.error) {
      const messages = {
        IDEMPOTENCY_CONFLICT: 'Chave de idempotência reutilizada com conteúdo diferente',
        QUOTE_CHANGED: 'Cotação alterada ou expirada. Revise os valores antes de confirmar.',
        FORBIDDEN: 'Carteira ou rede não autorizada',
        CONFLICT: 'Carrinho vazio, cupom inválido ou disponibilidade insuficiente',
      }
      return err(result.error === 'FORBIDDEN' ? 403 : 409, { code: result.error, message: messages[result.error] })
    }
    if (getScenarioFromRequest(request) === 'order-timeout' && !result.reused) await delay(9500)
    return HttpResponse.json(mockStore.getOrder(result.order.id)!, { status: result.reused ? 200 : 201 })
  }),

  http.get(`${API}/orders/attempts/:key`, async ({ request, params }) => {
    const failed = await maybeDelay(request)
    if (failed) return failed
    const session = authUser(request)
    if (!session) return err(401, { code: 'UNAUTHORIZED', message: 'Login necessário' })
    const order = mockStore.getOrderByIdempotency(session.user.id, String(params.key))
    if (!order) return err(404, { code: 'NOT_FOUND', message: 'Tentativa não encontrada' })
    return HttpResponse.json(order)
  }),
  http.get(`${API}/orders/:id`, async ({ request, params }) => {
    const failed = await maybeDelay(request)
    if (failed) return failed
    const session = authUser(request)
    if (!session) return err(401, { code: 'UNAUTHORIZED', message: 'Login necessário' })
    const order = mockStore.getOrder(String(params.id))
    if (!order) return err(404, { code: 'NOT_FOUND', message: 'Pedido não encontrado' })
    if (order.userId !== session.user.id) return err(403, { code: 'FORBIDDEN', message: 'Pedido não autorizado' })
    return HttpResponse.json(order)
  }),

  http.get(`${API}/profile`, async ({ request }) => {
    const failed = await maybeDelay(request)
    if (failed) return failed
    const session = authUser(request)
    if (!session) return err(401, { code: 'UNAUTHORIZED', message: 'Login necessário' })
    return HttpResponse.json(session.user)
  }),

  http.patch(`${API}/profile`, async ({ request }) => {
    const failed = await maybeDelay(request)
    if (failed) return failed
    const session = authUser(request)
    if (!session) return err(401, { code: 'UNAUTHORIZED', message: 'Login necessário' })
    const parsed = profileSchema.safeParse(await request.json())
    if (!parsed.success) return err(400, { code: 'VALIDATION', message: 'Dados inválidos', fields: validationFields(parsed.error) })
    const body = parsed.data
    const user = mockStore.updateProfile(session.user.id, body)
    return HttpResponse.json(user)
  }),

  http.post(`${API}/profile/password`, async ({ request }) => {
    const failed = await maybeDelay(request)
    if (failed) return failed
    const session = authUser(request)
    if (!session) return err(401, { code: 'UNAUTHORIZED', message: 'Login necessário' })
    const parsed = changePasswordSchema.safeParse(await request.json())
    if (!parsed.success) return err(400, { code: 'VALIDATION', message: 'Dados inválidos', fields: validationFields(parsed.error) })
    const body = parsed.data
    const result = await mockStore.changePassword(
      session.user.id,
      body.currentPassword ?? '',
      body.newPassword,
    )
    if ('error' in result && result.error === 'VALIDATION') {
      return err(400, {
        code: 'VALIDATION',
        message: 'Senha atual incorreta',
        fields: { currentPassword: 'Incorreta' },
      })
    }
    return HttpResponse.json({ ok: true })
  }),

  http.get(`${API}/wallets`, async ({ request }) => {
    const failed = await maybeDelay(request)
    if (failed) return failed
    const session = authUser(request)
    if (!session) return err(401, { code: 'UNAUTHORIZED', message: 'Login necessário' })
    return HttpResponse.json({ items: mockStore.getWallets(session.user.id) })
  }),

  http.post(`${API}/wallets`, async ({ request }) => {
    const failed = await maybeDelay(request)
    if (failed) return failed
    const session = authUser(request)
    if (!session) return err(401, { code: 'UNAUTHORIZED', message: 'Login necessário' })
    const body = (await request.json()) as Partial<Wallet> & {
      label?: string
      address?: string
      network?: string
      isPrimary?: boolean
    }
    const parsed = walletSchema.safeParse(body)
    if (!parsed.success) return err(400, { code: 'VALIDATION', message: 'Carteira inválida', fields: validationFields(parsed.error) })
    const wallet = mockStore.upsertWallet(session.user.id, {
      label: body.label!,
      address: body.address!,
      network: body.network!,
      isPrimary: Boolean(body.isPrimary),
      displayName: body.displayName ?? null,
      profileName: body.profileName ?? null,
      secondaryRef: body.secondaryRef ?? null,
      walletType: body.walletType ?? null,
      referralCode: body.referralCode ?? null,
      email: body.email ?? null,
      ensName: body.ensName ?? null,
      ensTld: body.ensTld ?? '.eth',
    })
    return HttpResponse.json(wallet, { status: 201 })
  }),

  http.patch(`${API}/wallets/:id`, async ({ request, params }) => {
    const failed = await maybeDelay(request)
    if (failed) return failed
    const session = authUser(request)
    if (!session) return err(401, { code: 'UNAUTHORIZED', message: 'Login necessário' })
    const existing = mockStore.getWallets(session.user.id).find((w) => w.id === String(params.id))
    if (!existing) return err(404, { code: 'NOT_FOUND', message: 'Carteira não encontrada' })
    const body = (await request.json()) as Partial<Wallet>
    const parsed = walletSchema.safeParse({ ...existing, ...body })
    if (!parsed.success) return err(400, { code: 'VALIDATION', message: 'Carteira inválida', fields: validationFields(parsed.error) })
    const wallet = mockStore.upsertWallet(session.user.id, {
      id: String(params.id),
      label: body.label ?? existing?.label ?? 'Carteira',
      address: body.address ?? existing?.address ?? '0x0',
      network: body.network ?? existing?.network ?? 'Ethereum',
      isPrimary: body.isPrimary ?? existing?.isPrimary ?? false,
      displayName: body.displayName ?? existing?.displayName ?? null,
      profileName: body.profileName ?? existing?.profileName ?? null,
      secondaryRef: body.secondaryRef ?? existing?.secondaryRef ?? null,
      walletType: body.walletType ?? existing?.walletType ?? null,
      referralCode: body.referralCode ?? existing?.referralCode ?? null,
      email: body.email ?? existing?.email ?? null,
      ensName: body.ensName ?? existing?.ensName ?? null,
      ensTld: body.ensTld ?? existing?.ensTld ?? '.eth',
    })
    return HttpResponse.json(wallet)
  }),
]
