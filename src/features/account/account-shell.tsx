import { Link, useRouterState } from '@tanstack/react-router'
import {
  Activity,
  Download,
  Heart,
  HelpCircle,
  LogOut,
  Tag,
  UserRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/session'
import { cn } from '@/shared/lib/utils'
import type { ReactNode } from 'react'

type NavItem =
  | { kind: 'link'; label: string; to: '/profile' | '/wallets'; icon: LucideIcon }
  | { kind: 'soon'; label: string; icon: LucideIcon }
  | { kind: 'logout'; label: string; icon: LucideIcon }

const navItems: NavItem[] = [
  { kind: 'link', label: 'Dados do perfil', to: '/profile', icon: UserRound },
  { kind: 'link', label: 'Carteiras', to: '/wallets', icon: Wallet },
  { kind: 'soon', label: 'Atividade', icon: Activity },
  { kind: 'soon', label: 'Lista de interesse', icon: Heart },
  { kind: 'soon', label: 'Ofertas', icon: Tag },
  { kind: 'soon', label: 'Arquivos baixados', icon: Download },
  { kind: 'soon', label: 'Suporte', icon: HelpCircle },
  { kind: 'logout', label: 'Sair', icon: LogOut },
]

export function AccountShell({
  title,
  children,
}: {
  title?: string
  children: ReactNode
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { logout } = useAuth()

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-10 lg:px-[120px] lg:py-12">
      <div className="grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-14">
        <aside>
          <h2 className="mb-5 text-base font-bold text-foreground">Meu perfil</h2>
          <nav aria-label="Conta" className="space-y-0.5">
            {navItems.map((item) => {
              if (item.kind === 'logout') {
                return (
                  <div key={item.label}>
                    <div className="my-3 border-t border-foreground/15" />
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-r-[4px] px-3 py-2.5 text-left text-sm text-foreground/85 transition hover:bg-white/[0.03] hover:text-foreground"
                      onClick={() => void logout()}
                    >
                      <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                      {item.label}
                    </button>
                  </div>
                )
              }

              if (item.kind === 'soon') {
                return (
                  <button
                    key={item.label}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-r-[4px] px-3 py-2.5 text-left text-sm text-foreground/85 transition hover:bg-white/[0.03] hover:text-foreground"
                    onClick={() => toast.message('Em breve')}
                  >
                    <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    {item.label}
                  </button>
                )
              }

              const active = pathname === item.to || pathname.startsWith(`${item.to}/`)
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={cn(
                    'flex items-center gap-3 rounded-r-[4px] border-l-2 px-3 py-2.5 text-sm transition',
                    active
                      ? 'border-primary bg-primary/5 text-text-accent'
                      : 'border-transparent text-foreground/85 hover:bg-white/[0.03] hover:text-foreground',
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        <div className="min-w-0">
          {title ? (
            <h1 className="mb-8 text-[28px] font-bold tracking-tight text-foreground sm:text-[32px]">
              {title}
            </h1>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  )
}

export const profileFieldClass =
  'h-11 w-full rounded-[6px] border border-[#3d2e24] bg-transparent px-3.5 text-sm text-foreground outline-none placeholder:text-placeholder transition-colors focus:border-text-accent aria-[invalid=true]:border-destructive'

export function RequiredMark() {
  return <span className="text-primary">*</span>
}
