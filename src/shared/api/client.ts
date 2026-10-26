import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ApiErrorBody } from '@/shared/api/types'
import { getScenarioFromClient } from '@/mocks/scenarios'
import { networkReady } from '@/app/network-ready'

const TOKEN_KEY = 'kurio:token'
const GUEST_KEY = 'kurio:guestId'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function getGuestId() {
  let id = localStorage.getItem(GUEST_KEY)
  if (!id) {
    id = `guest_${crypto.randomUUID().slice(0, 10)}`
    localStorage.setItem(GUEST_KEY, id)
  }
  return id
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 8000,
})

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  await networkReady
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  config.headers['X-Guest-Id'] = getGuestId()
  config.headers['X-Kurio-Scenario'] = getScenarioFromClient()
  return config
})

type UnauthorizedHandler = (redirectTo: string) => void
let unauthorizedHandler: UnauthorizedHandler | null = null

/** Register UI recovery for mid-flow 401 (login with redirect preserved). */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler
}

function requestPath(url?: string) {
  if (!url) return ''
  try {
    return new URL(url, window.location.origin).pathname
  } catch {
    return url
  }
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status
    const path = requestPath(error.config?.url)
    const isAuthAttempt =
      path.includes('/auth/login') || path.includes('/auth/register') || path.includes('/auth/session')

    const requestToken = error.config?.headers?.Authorization
    if (status === 401 && !isAuthAttempt && requestToken === `Bearer ${getToken()}`) {
      setToken(null)
      const redirectTo = `${window.location.pathname}${window.location.search}` || '/'
      unauthorizedHandler?.(redirectTo.startsWith('/') ? redirectTo : '/')
    }
    return Promise.reject(error)
  },
)

export function getApiError(error: unknown): ApiErrorBody {
  const ax = error as AxiosError<ApiErrorBody>
  if (ax.response?.data?.code) return ax.response.data
  if (ax.code === 'ECONNABORTED') {
    return { code: 'TRANSIENT', message: 'Tempo esgotado. Tente novamente.' }
  }
  return { code: 'TRANSIENT', message: ax.message || 'Erro de rede' }
}

export function isUnauthorized(error: unknown) {
  return getApiError(error).code === 'UNAUTHORIZED'
}
