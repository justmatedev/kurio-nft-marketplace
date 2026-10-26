import * as Dialog from '@radix-ui/react-dialog'
import { useOwnerId } from '@/shared/api/query-keys'
import { useEffect, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { LogIn, Menu, ShoppingCart, User, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuthModal } from '@/features/auth/auth-modal'
import { useAuth } from '@/features/auth/session'
import { endpoints } from '@/shared/api/endpoints'
import { HeaderSearch } from '@/app/header-search'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

const nav = [
  { label: 'Início', href: '/' },
  { label: 'Mercado', href: '/#catalogo' },
  { label: 'Criadores', href: '/#promos' },
  { label: 'Aprenda', href: '/#diario' },
] as const

export function AppHeader() {
  const ownerId = useOwnerId()
  const { isAuthenticated, user, logout } = useAuth()
  const { openAuth } = useAuthModal()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [menuOpen, setMenuOpen] = useState(false)

  const cartQuery = useQuery({
    queryKey: ['cart', ownerId],
    queryFn: ({ signal }) => endpoints.cart(signal),
  })
  const count = cartQuery.data?.items.reduce((a, i) => a + i.quantity, 0) ?? 0

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // Home, cart, detalhe NFT, checkout: chrome próprio no mobile (Figma)
  const hideOnMobileChrome =
    pathname === '/' ||
    pathname === '/cart' ||
    pathname === '/checkout' ||
    /^\/nfts\/[^/]+$/.test(pathname)

  return (
    <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
    <header
      className={cn(
        'sticky top-0 z-40 bg-background',
        hideOnMobileChrome && 'hidden md:block',
      )}
    >
      <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between gap-4 px-6 lg:px-[120px]">
        <div className="flex items-center gap-2">
          <Dialog.Trigger asChild><button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center text-white/90 hover:text-white md:hidden"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
          >
            {menuOpen ? (
              <X className="h-5 w-5" strokeWidth={1.75} />
            ) : (
              <Menu className="h-5 w-5" strokeWidth={1.75} />
            )}
          </button></Dialog.Trigger>

          <Link
            to="/"
            className="shrink-0 text-[22px] font-extrabold tracking-[0.14em] text-white uppercase"
          >
            Kurio
          </Link>
        </div>

        <nav
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-10 md:flex"
          aria-label="Principal"
        >
          {nav.map((item) => {
            const active =
              (item.label === 'Início' && pathname === '/') ||
              (item.label === 'Mercado' &&
                (pathname.startsWith('/nfts') || pathname === '/cart' || pathname === '/checkout'))
            return (
              <a
                key={item.label}
                href={item.href}
                className={cn(
                  'text-[15px] font-medium transition-colors',
                  active
                    ? 'text-primary underline decoration-primary decoration-2 underline-offset-[10px]'
                    : 'text-white/80 hover:text-white',
                )}
              >
                {item.label}
              </a>
            )
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <HeaderSearch />

          <Link
            to="/cart"
            className="relative inline-flex h-10 w-10 items-center justify-center text-white/90 hover:text-white"
            aria-label={`Carrinho com ${count} itens`}
          >
            <ShoppingCart className="h-5 w-5" strokeWidth={1.75} />
            <span className="absolute -right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {count}
            </span>
          </Link>

          {isAuthenticated ? (
            <>
              <Button variant="ghost" size="sm" asChild className="hidden text-white sm:inline-flex">
                <Link to="/profile">
                  <User className="h-4 w-4" />
                  {user?.name.split(' ')[0]}
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="hidden border-white/20 text-white sm:inline-flex"
                onClick={() => void logout()}
              >
                Sair
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              className="hidden gap-2 sm:inline-flex"
              onClick={() => openAuth('login')}
            >
              <LogIn className="h-4 w-4" strokeWidth={2} />
              Entrar
            </Button>
          )}
        </div>
      </div>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 md:hidden" />
        <Dialog.Content id="mobile-nav" aria-describedby={undefined} className="fixed inset-x-0 top-20 z-50 max-h-[calc(100dvh-5rem)] overflow-y-auto border-t border-border bg-card md:hidden">
          <Dialog.Title className="sr-only">Menu de navegação</Dialog.Title>
          <Dialog.Close className="absolute right-3 top-3 p-2" aria-label="Fechar menu"><X className="h-5 w-5" /></Dialog.Close>
          <nav className="mx-auto flex max-w-[1440px] flex-col gap-1 px-6 py-4" aria-label="Mobile">
            {nav.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="rounded-[8px] px-3 py-3 text-base text-foreground hover:bg-white/5"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-4">
              {isAuthenticated ? (
                <>
                  <Button variant="outline" className="justify-start border-white/20 text-white" asChild>
                    <Link to="/profile" onClick={() => setMenuOpen(false)}>
                      <User className="h-4 w-4" />
                      {user?.name.split(' ')[0]}
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start text-white"
                    onClick={() => {
                      setMenuOpen(false)
                      void logout()
                    }}
                  >
                    Sair
                  </Button>
                </>
              ) : (
                <Button
                  className="justify-start gap-2"
                  onClick={() => {
                    setMenuOpen(false)
                    openAuth('login')
                  }}
                >
                  <LogIn className="h-4 w-4" strokeWidth={2} />
                  Entrar
                </Button>
              )}
            </div>
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </header>
    </Dialog.Root>
  )
}

const footerFeatures = [
  {
    letter: 'W',
    title: 'Segurança da carteira',
    body: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    letter: 'C',
    title: 'Criadores em destaque',
    body: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    letter: 'D',
    title: 'Alertas de lançamentos',
    body: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
] as const

const footerCols = [
  {
    title: 'Meu perfil',
    links: ['Meu perfil', 'Minha coleção', 'Atividade', 'Estúdio do criador', 'Lista de interesse'],
  },
  {
    title: 'Central de ajuda',
    links: [
      'Central de ajuda',
      'Como comprar NFTs',
      'Carteira e segurança',
      'Política do mercado',
      'Denunciar item',
    ],
  },
  {
    title: 'Coleções',
    links: ['Arte digital', 'Fotografia', 'Música', 'Arte 3D', 'Utilidade'],
  },
] as const

function SocialIcon({ name }: { name: 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'youtube' }) {
  const common = 'h-[18px] w-[18px]'
  if (name === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="currentColor" aria-hidden>
        <path d="M14 8h2V5h-2c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.2l.8-3H13V9c0-.6.4-1 1-1z" />
      </svg>
    )
  }
  if (name === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  if (name === 'twitter') {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="currentColor" aria-hidden>
        <path d="M18.2 3H21l-6.5 7.4L22 21h-5.6l-4.4-5.7L7 21H4.2l7-8L2 3h5.7l4 5.2L18.2 3zm-1 16.2h1.6L7 4.7H5.3l11.9 14.5z" />
      </svg>
    )
  }
  if (name === 'linkedin') {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="currentColor" aria-hidden>
        <path d="M6.5 9.5H3.8V20h2.7V9.5zM5.15 4A1.75 1.75 0 1 0 5.16 7.5 1.75 1.75 0 0 0 5.15 4zM20.2 20h-2.7v-5.3c0-1.5-.5-2.5-1.8-2.5-1 0-1.5.7-1.8 1.3-.1.2-.1.5-.1.8V20h-2.7s.05-9.2 0-10.2h2.7v1.4c.4-.6 1.1-1.6 2.7-1.6 2 0 3.5 1.3 3.5 4.1V20z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className={common} fill="currentColor" aria-hidden>
      <path d="M22 8.2a2.7 2.7 0 0 0-1.9-1.9C18.4 6 12 6 12 6s-6.4 0-8.1.3A2.7 2.7 0 0 0 2 8.2 28 28 0 0 0 1.7 12a28 28 0 0 0 .3 3.8 2.7 2.7 0 0 0 1.9 1.9C5.6 18 12 18 12 18s6.4 0 8.1-.3a2.7 2.7 0 0 0 1.9-1.9 28 28 0 0 0 .3-3.8 28 28 0 0 0-.3-3.8zM10 14.7V9.3L15.2 12 10 14.7z" />
    </svg>
  )
}

const socials = [
  { name: 'facebook' as const, label: 'Facebook' },
  { name: 'instagram' as const, label: 'Instagram' },
  { name: 'twitter' as const, label: 'Twitter' },
  { name: 'linkedin' as const, label: 'LinkedIn' },
  { name: 'youtube' as const, label: 'YouTube' },
]

export function AppFooter() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  // Carrinho / checkout mobile: chrome Figma (sem footer global)
  const hideOnMobileChrome = pathname === '/cart' || pathname === '/checkout'

  return (
    <footer
      className={cn(
        'mt-auto bg-background text-foreground',
        hideOnMobileChrome && 'hidden md:block',
      )}
    >
      <div className="border-y border-foreground/15">
        <div className="mx-auto grid max-w-[1440px] lg:grid-cols-4">
          {footerFeatures.map((item) => (
            <div
              key={item.title}
              className="flex gap-4 border-b border-foreground/15 px-6 py-8 lg:border-b-0 lg:border-r lg:px-8 lg:py-10"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {item.letter}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{item.body}</p>
              </div>
            </div>
          ))}
          <div className="px-6 py-8 lg:px-8 lg:py-10">
            <h2 className="text-base font-bold leading-snug text-foreground">
              Antecipe-se ao próximo lançamento
            </h2>
            <form
              className="mt-4 flex overflow-hidden rounded-[8px] border border-foreground/15 bg-[#1a110d]"
              onSubmit={(e) => e.preventDefault()}
            >
              <label className="flex-1">
                <span className="sr-only">E-mail</span>
                <input
                  type="email"
                  placeholder="digite seu e-mail..."
                  className="h-11 w-full bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-placeholder"
                />
              </label>
              <Button type="submit" className="h-11 rounded-none rounded-r-[7px] px-5 font-bold">
                Enviar
              </Button>
            </form>
            <p className="mt-3 text-xs leading-5 text-text-secondary">
              Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
            </p>
          </div>
        </div>
      </div>

      <div className="border-b border-foreground/15 bg-[#24160f]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-6 py-5 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between lg:px-[120px]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-10">
            <p className="text-base font-extrabold tracking-[0.12em] uppercase">Kurio</p>
            <p className="max-w-[220px] leading-5">
              Feito para colecionadores,
              <br />
              criadores e cultura
            </p>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-10">
            <p>contato@email.com</p>
            <p>+55 11 4002 8922</p>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1440px] gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8 lg:px-[120px]">
        {footerCols.map((col) => (
          <div key={col.title}>
            <p className="mb-4 text-sm font-bold text-foreground">{col.title}</p>
            <ul className="space-y-2.5 text-sm text-foreground">
              {col.links.map((link) => (
                <li key={link}>
                  <span className="cursor-default opacity-90 hover:opacity-100">{link}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="space-y-6">
          <div>
            <p className="mb-4 text-sm font-bold text-foreground">Redes sociais</p>
            <div className="flex flex-wrap gap-2.5" aria-hidden="true">
              {socials.map((s) => (
                <span
                  key={s.name}
                  className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-text-accent text-text-accent"
                  title={s.label}
                >
                  <SocialIcon name={s.name} />
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-sm font-bold text-foreground">Carteiras compatíveis</p>
            <p className="inline-flex rounded-full border border-text-accent bg-[#1a110d] px-4 py-2 text-[10px] tracking-wide text-text-accent uppercase">
              METAMASK&nbsp;&nbsp;•&nbsp;&nbsp;WALLETCONNECT&nbsp;&nbsp;•&nbsp;&nbsp;COINBASE
            </p>
          </div>
        </div>
      </div>

      <div className="relative border-t border-black bg-black py-4 text-center text-xs text-foreground">
        <p>© 2026 Kurio. Propriedade digital para todos.</p>
        <button
          type="button"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-foreground/70 underline-offset-2 hover:text-foreground hover:underline lg:right-[120px]"
          onClick={() => {
            void endpoints.resetMocks().then(() => window.location.reload())
          }}
        >
          Resetar mocks
        </button>
      </div>
    </footer>
  )
}
