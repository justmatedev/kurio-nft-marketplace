import { api } from '@/shared/api/client'
import type {
  Cart,
  CreateOrderInput,
  Favorite,
  Nft,
  NftListParams,
  Order,
  Paginated,
  Quote,
  Session,
  User,
  Wallet,
} from '@/shared/api/types'

export const endpoints = {
  catalogMeta: (signal?: AbortSignal) => api.get<{ collections: Record<string, number>; networks: Record<string, number>; featured: Nft[] }>('/catalog/meta', { signal }).then(r => r.data),
  listNfts: (params: NftListParams, signal?: AbortSignal) =>
    api.get<Paginated<Nft>>('/nfts', { params, signal }).then((r) => r.data),
  getNft: (id: string, signal?: AbortSignal) => api.get<Nft>(`/nfts/${id}`, { signal }).then((r) => r.data),

  register: (body: { email: string; name: string; password: string; guestId?: string }) =>
    api.post<Session>('/auth/register', body).then((r) => r.data),
  login: (body: { email: string; password: string; guestId?: string }) =>
    api.post<Session>('/auth/login', body).then((r) => r.data),
  session: (signal?: AbortSignal) => api.get<Session>('/auth/session', { signal }).then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),

  favorites: (signal?: AbortSignal) => api.get<{ items: Favorite[] }>('/favorites', { signal }).then((r) => r.data.items),
  addFavorite: (nftId: string) =>
    api.post<{ items: Favorite[] }>(`/favorites/${nftId}`).then((r) => r.data.items),
  removeFavorite: (nftId: string) =>
    api.delete<{ items: Favorite[] }>(`/favorites/${nftId}`).then((r) => r.data.items),

  cart: (signal?: AbortSignal) => api.get<Cart>('/cart', { signal }).then((r) => r.data),
  addCartItem: (body: { nftId: string; editionId: string; quantity: number }) =>
    api.post<Cart>('/cart/items', body).then((r) => r.data),
  updateCartItem: (id: string, quantity: number) =>
    api.patch<Cart>(`/cart/items/${id}`, { quantity }).then((r) => r.data),
  removeCartItem: (id: string) => api.delete<Cart>(`/cart/items/${id}`).then((r) => r.data),
  quote: (couponCode?: string | null, walletId?: string, network?: string, signal?: AbortSignal) =>
    api.post<Quote>('/quote', { couponCode, walletId, network }, { signal }).then((r) => r.data),

  createOrder: (
    body: CreateOrderInput,
    idempotencyKey: string,
  ) =>
    api
      .post<Order>('/orders', body, { headers: { 'Idempotency-Key': idempotencyKey } })
      .then((r) => r.data),
  getOrder: (id: string, signal?: AbortSignal) => api.get<Order>(`/orders/${id}`, { signal }).then((r) => r.data),

  recoverOrder: (key: string) => api.get<Order>(`/orders/attempts/${encodeURIComponent(key)}`).then(r => r.data),

  profile: (signal?: AbortSignal) => api.get<User>('/profile', { signal }).then((r) => r.data),
  updateProfile: (
    body: Partial<
      Pick<User, 'name' | 'username' | 'ensName' | 'ensTld' | 'walletNickname' | 'avatarUrl'>
    >,
  ) => api.patch<User>('/profile', body).then((r) => r.data),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    api.post('/profile/password', body).then((r) => r.data),

  wallets: (signal?: AbortSignal) => api.get<{ items: Wallet[] }>('/wallets', { signal }).then((r) => r.data.items),
  createWallet: (body: Omit<Wallet, 'id'>) =>
    api.post<Wallet>('/wallets', body).then((r) => r.data),
  updateWallet: (id: string, body: Partial<Omit<Wallet, 'id'>>) =>
    api.patch<Wallet>(`/wallets/${id}`, body).then((r) => r.data),

  resetMocks: () => api.post('/dev/reset').then((r) => r.data),
}
