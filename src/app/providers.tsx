import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { type ReactNode, useEffect, useState } from 'react'
import { AuthModalProvider, useAuthModal } from '@/features/auth/auth-modal'
import { AuthProvider, useAuth } from '@/features/auth/session'
import { SocketProvider } from '@/app/socket'
import { setUnauthorizedHandler } from '@/shared/api/client'
import { Toaster } from '@/shared/ui/toaster'

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: { retry: 0 },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthModalProvider>
          <UnauthorizedBridge />
          <SocketProvider>
            {children}
            <Toaster />
            <div className="sr-only" aria-live="polite" id="live-region" />
          </SocketProvider>
        </AuthModalProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

/** Wire Axios 401 → clear session + resume login with redirect. */
function UnauthorizedBridge() {
  const navigate = useNavigate()
  const { setSession } = useAuth()
  const { openAuth } = useAuthModal()

  useEffect(() => {
    setUnauthorizedHandler((redirectTo) => {
      setSession(null)
      openAuth('login', redirectTo)
      void navigate({ to: '/login', search: { redirect: redirectTo } })
    })
    return () => setUnauthorizedHandler(null)
  }, [navigate, openAuth, setSession])

  return null
}
