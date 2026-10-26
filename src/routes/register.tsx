import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuthModal } from '@/features/auth/auth-modal'

const parseSearch = (input: Record<string, unknown>) => ({
  redirect: typeof input.redirect === 'string' ? input.redirect : undefined,
})

export const Route = createFileRoute('/register')({
  validateSearch: parseSearch,
  component: RegisterRoute,
})

/** Mantém /register para deep links; abre o modal de cadastro na home. */
function RegisterRoute() {
  const navigate = Route.useNavigate()
  const { redirect: redirectTo } = Route.useSearch()
  const { openAuth } = useAuthModal()

  useEffect(() => {
    openAuth('register', redirectTo)
    void navigate({ to: '/', replace: true })
  }, [navigate, openAuth, redirectTo])

  return null
}
