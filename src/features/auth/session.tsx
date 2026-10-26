import {
  Fragment,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { endpoints } from '@/shared/api/endpoints'
import { getGuestId, getToken, setToken, isUnauthorized } from '@/shared/api/client'
import type { Session, User } from '@/shared/api/types'

type AuthContextValue = {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<Session>
  register: (input: { email: string; name: string; password: string }) => Promise<Session>
  logout: () => Promise<void>
  setSession: (session: Session | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [token, setTokenState] = useState<string | null>(() => getToken())

  const sessionQuery = useQuery({
    queryKey: ['session', token],
    queryFn: ({ signal }) => endpoints.session(signal),
    enabled: Boolean(token),
    retry: false,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (sessionQuery.isError && isUnauthorized(sessionQuery.error) && token) {
      setToken(null)
      setTokenState(null)
      queryClient.clear()
    }
  }, [sessionQuery.isError, sessionQuery.error, token, queryClient])

  const setSession = useCallback(
    (session: Session | null) => {
      void queryClient.cancelQueries()
      queryClient.removeQueries({ predicate: q => !['nfts', 'nft'].includes(String(q.queryKey[0])) })
      setToken(session?.token ?? null)
      setTokenState(session?.token ?? null)
      if (session) {
        queryClient.setQueryData(['session', session.token], session)
      } else {
        queryClient.clear()
      }
    },
    [queryClient],
  )

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await endpoints.login({ email, password, guestId: getGuestId() })
      setSession(session)
      if (session.cartAdjustments?.length) toast.message('Carrinho atualizado', { description: session.cartAdjustments.join('. ') })
      await queryClient.invalidateQueries({ queryKey: ['cart'] })
      return session
    },
    [queryClient, setSession],
  )

  const register = useCallback(
    async (input: { email: string; name: string; password: string }) => {
      const session = await endpoints.register({ ...input, guestId: getGuestId() })
      setSession(session)
      if (session.cartAdjustments?.length) toast.message('Carrinho atualizado', { description: session.cartAdjustments.join('. ') })
      return session
    },
    [setSession],
  )

  const logout = useCallback(async () => {
    try {
      await endpoints.logout()
    } finally {
      setSession(null)
    }
  }, [setSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: sessionQuery.data?.user ?? null,
      token,
      isLoading: Boolean(token) && sessionQuery.isLoading,
      isAuthenticated: Boolean(sessionQuery.data?.user),
      login,
      register,
      logout,
      setSession,
    }),
    [sessionQuery.data?.user, sessionQuery.isLoading, token, login, register, logout, setSession],
  )

  return <AuthContext.Provider value={value}><Fragment key={token ?? 'guest'}>{children}</Fragment></AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
