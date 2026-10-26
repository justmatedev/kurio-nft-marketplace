import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuthModal } from '@/features/auth/auth-modal'

const parseSearch = (input: Record<string, unknown>) => ({
  redirect: typeof input.redirect === 'string' ? input.redirect : undefined,
})

export const Route = createFileRoute('/login')({
  validateSearch: parseSearch,
  component: LoginRoute,
})

/** Mantém /login para deep links e requireAuth; abre o modal na home. */
function LoginRoute() {
  const navigate = Route.useNavigate()
  const { redirect: redirectTo } = Route.useSearch()
  const { openAuth } = useAuthModal()

  useEffect(() => {
    openAuth('login', redirectTo)
    void navigate({ to: '/', replace: true })
  }, [navigate, openAuth, redirectTo])

  return null
}
