import { useOwnerId } from '@/shared/api/query-keys'
import { Link, useRouterState } from '@tanstack/react-router'
import { Heart, Home, ShoppingCart, User } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuthModal } from '@/features/auth/auth-modal'
import { useAuth } from '@/features/auth/session'
import { endpoints } from '@/shared/api/endpoints'
import { cn } from '@/shared/lib/utils'

/** Ícone de viewfinder/scan do Figma (cantoneiras + linha). */
function ScanFabIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M7 4H5.5A1.5 1.5 0 0 0 4 5.5V7" />
      <path d="M17 4h1.5A1.5 1.5 0 0 1 20 5.5V7" />
      <path d="M7 20H5.5A1.5 1.5 0 0 1 4 18.5V17" />
      <path d="M17 20h1.5a1.5 1.5 0 0 0 1.5-1.5V17" />
      <path d="M8 12h8" />
    </svg>
  )
}

const iconInactive = 'text-[#CFB28C]/85 hover:text-[#CFB28C]'
const iconSlot =
  'relative z-[1] flex h-full items-center justify-center text-[0] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

export function MobileDock() {
  const ownerId = useOwnerId()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { isAuthenticated } = useAuth()
  const { openAuth } = useAuthModal()

  const cartQuery = useQuery({
    queryKey: ['cart', ownerId],
    queryFn: ({ signal }) => endpoints.cart(signal),
  })
  const count = cartQuery.data?.items.reduce((a, i) => a + i.quantity, 0) ?? 0

  if (pathname !== '/') return null

  const focusSearch = () => {
    const input = document.getElementById('mobile-home-search') as HTMLInputElement | null
    input?.focus()
    input?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const onFavorites = () => {
    if (!isAuthenticated) {
      openAuth('login', '/')
      return
    }
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })
  }

  const onProfile = () => {
    if (!isAuthenticated) openAuth('login', '/profile')
  }

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden"
      aria-label="Navegação inferior"
    >
      <div className="pointer-events-auto relative mx-auto w-full max-w-[420px] px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-7">
        {/* Barra com notch côncavo real (SVG) */}
        <div className="relative h-[58px] w-full">
          <svg
            className="absolute inset-0 h-full w-full drop-shadow-[0_-6px_24px_rgba(0,0,0,0.45)]"
            viewBox="0 0 360 58"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              fill="#1c1612"
              d="
                M 22 0
                H 118
                C 128 0 134 6 140 14
                C 150 30 210 30 220 14
                C 226 6 232 0 242 0
                H 338
                C 350 0 360 10 360 22
                V 36
                C 360 48 350 58 338 58
                H 22
                C 10 58 0 48 0 36
                V 22
                C 0 10 10 0 22 0
                Z
              "
            />
          </svg>

          {/* 5 faixas: ícone · ícone · vão FAB · ícone · ícone */}
          <div className="absolute inset-0 grid grid-cols-5">
            <Link
              to="/"
              className={cn(iconSlot, 'text-primary')}
              aria-current="page"
              aria-label="Início"
            >
              <Home className="h-[22px] w-[22px]" strokeWidth={1.75} fill="currentColor" />
            </Link>

            <button
              type="button"
              className={cn(iconSlot, iconInactive)}
              aria-label="Favoritos"
              onClick={onFavorites}
            >
              <Heart className="h-[22px] w-[22px]" strokeWidth={1.75} />
            </button>

            <div className="pointer-events-none" aria-hidden />

            <Link
              to="/cart"
              className={cn(iconSlot, iconInactive)}
              aria-label={`Carrinho com ${count} itens`}
            >
              <ShoppingCart className="h-[22px] w-[22px]" strokeWidth={1.75} />
              {count > 0 ? (
                <span className="absolute right-[18%] top-[10px] flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                  {count}
                </span>
              ) : null}
            </Link>

            {isAuthenticated ? (
              <Link to="/profile" className={cn(iconSlot, iconInactive)} aria-label="Perfil">
                <User className="h-[22px] w-[22px]" strokeWidth={1.75} />
              </Link>
            ) : (
              <button
                type="button"
                className={cn(iconSlot, iconInactive)}
                aria-label="Perfil"
                onClick={onProfile}
              >
                <User className="h-[22px] w-[22px]" strokeWidth={1.75} />
              </button>
            )}
          </div>
        </div>

        {/* FAB — centro do notch */}
        <button
          type="button"
          className={cn(
            'absolute left-1/2 top-0 z-10 flex h-[52px] w-[52px] -translate-x-1/2',
            'items-center justify-center rounded-full bg-primary text-primary-foreground',
            'shadow-[0_0_28px_rgba(209,137,77,0.55)]',
          )}
          aria-label="Buscar"
          onClick={focusSearch}
        >
          <ScanFabIcon className="h-6 w-6" />
        </button>
      </div>
    </nav>
  )
}
