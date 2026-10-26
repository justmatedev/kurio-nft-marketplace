export type EthString = string

export type ApiErrorCode =
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'QUOTE_CHANGED'
  | 'GONE'
  | 'TRANSIENT'
  | 'IDEMPOTENCY_CONFLICT'

export interface ApiErrorBody {
  code: ApiErrorCode
  message: string
  fields?: Record<string, string>
}

export interface User {
  id: string
  email: string
  name: string
  /** Nome de usuário exibido no perfil (Figma). */
  username: string
  /** Nome ENS sem TLD (ex.: alice). */
  ensName: string | null
  /** Sufixo ENS, ex.: .eth */
  ensTld: string
  /** Apelido da carteira no perfil. */
  walletNickname: string | null
  avatarUrl: string | null
  createdAt: string
}

export interface Session {
  cartAdjustments?: string[]
  token: string
  user: User
  expiresAt: string
}

export interface NftEdition {
  id: string
  label: string
  available: number
  total: number
  priceEth: EthString
}

export interface Nft {
  id: string
  slug: string
  name: string
  collection: string
  description: string
  imageUrl: string
  gallery: string[]
  creator: string
  version: number
  featured: boolean
  tags: string[]
  /** Rede da sidebar (Ethereum / Polygon / Solana). */
  network: string
  editions: NftEdition[]
  createdAt: string
}

export interface NftListParams {
  q?: string
  collection?: string
  network?: string
  minPrice?: string
  maxPrice?: string
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'oldest'
  page?: number
  pageSize?: number
}

export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface CartItem {
  id: string
  nftId: string
  editionId: string
  quantity: number
  unitPriceEth: EthString
  nftName: string
  editionLabel: string
  imageUrl: string
  available: number
}

export interface Cart {
  revision: number
  id: string
  items: CartItem[]
  couponCode: string | null
  updatedAt: string
}

export interface Quote {
  quoteId: string
  cartRevision: number
  revision: string
  expiresAt: string
  walletId: string | null
  network: string | null
  subtotalEth: EthString
  discountEth: EthString
  networkFeeEth: EthString
  totalEth: EthString
  couponCode: string | null
  couponValid: boolean
  couponMessage: string | null
  stale: boolean
  quotedAt: string
  items: Array<{
    cartItemId: string
    nftId: string
    editionId: string
    quantity: number
    unitPriceEth: EthString
    lineTotalEth: EthString
    available: number
  }>
}

export type OrderStatus = 'pending' | 'confirmed' | 'rejected'

export interface CreateOrderInput {
  quoteId: string
  collectorName: string
  collectorEmail: string
  collectorUsername?: string
  notes?: string
  walletId: string
  network: string
}

export interface Order {
  userId: string
  quoteId: string
  walletSnapshot: Wallet
  collectorUsername: string
  notes: string
  id: string
  status: OrderStatus
  version: number
  idempotencyKey: string
  txRef: string | null
  explorerUrl: string | null
  collectorName: string
  collectorEmail: string
  walletId: string
  network: string
  items: Array<{
    cartItemId: string
    editionId: string
    nftId: string
    nftName: string
    editionLabel: string
    imageUrl: string
    quantity: number
    unitPriceEth: EthString
    lineTotalEth: EthString
  }>
  subtotalEth: EthString
  discountEth: EthString
  networkFeeEth: EthString
  totalEth: EthString
  couponCode: string | null
  createdAt: string
  updatedAt: string
  rejectionReason: string | null
}

export interface Wallet {
  id: string
  /** Apelido da carteira (API / checkout). */
  label: string
  address: string
  network: string
  isPrimary: boolean
  displayName?: string | null
  profileName?: string | null
  secondaryRef?: string | null
  walletType?: string | null
  referralCode?: string | null
  email?: string | null
  ensName?: string | null
  ensTld?: string | null
}

export interface Favorite {
  nftId: string
  createdAt: string
}

export interface NftUpdatedEvent {
  eventId: string
  type: 'nft.updated'
  id: string
  version: number
  priceEth?: EthString
  editionId?: string
  available?: number
  at: string
}

export interface OrderUpdatedEvent {
  eventId: string
  userId: string
  type: 'order.updated'
  id: string
  version: number
  status: OrderStatus
  txRef?: string | null
  explorerUrl?: string | null
  rejectionReason?: string | null
  at: string
}

export type RealtimeEvent = NftUpdatedEvent | OrderUpdatedEvent

export type ScenarioId =
  | 'default'
  | 'empty'
  | 'slow'
  | 'flaky'
  | 'session-expired'
  | 'coupon-invalid'
  | 'price-changed'
  | 'order-timeout'
  | 'payment-rejected'
  | 'favorites-fail'
  | 'catalog-error'
  | FailureScenario

export type FailureScenario = 'socket-unavailable' | 'network-error' | 'out-of-order' | 'sold-out' | 'coupon-expired'
