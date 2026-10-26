import { createContext, lazy, Suspense, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

const AuthModal = lazy(() => import('./auth-modal-content'))

export type AuthModalMode = 'login' | 'register'

type AuthModalState = {
  open: boolean
  mode: AuthModalMode
  redirectTo?: string
}

type AuthModalContextValue = {
  openAuth: (mode?: AuthModalMode, redirectTo?: string) => void
  closeAuth: () => void
  state: AuthModalState
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null)

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthModalState>({ open: false, mode: 'login' })

  const openAuth = useCallback((mode: AuthModalMode = 'login', redirectTo?: string) => {
    setState({ open: true, mode, redirectTo })
  }, [])

  const closeAuth = useCallback(() => {
    setState((s) => ({ ...s, open: false }))
  }, [])

  const value = useMemo(
    () => ({ openAuth, closeAuth, state }),
    [openAuth, closeAuth, state],
  )

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      {state.open && <Suspense fallback={<div role="status" className="fixed inset-0 z-[100] grid place-content-center bg-background/90 text-foreground">Carregando formulário…</div>}><AuthModal /></Suspense>}
    </AuthModalContext.Provider>
  )
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext)
  if (!ctx) throw new Error('useAuthModal must be used within AuthModalProvider')
  return ctx
}
