import { QueryError, QueryLoading } from '@/shared/ui/query-state'
import { Outlet, createRootRoute, Link, useRouter } from '@tanstack/react-router'
import { AppFooter, AppHeader } from '@/app/layout'
import { AppProviders } from '@/app/providers'
import { MobileDock } from '@/features/catalog/mobile-dock'

export const Route = createRootRoute({
  component: RootComponent,
  pendingComponent: () => <QueryLoading label="Carregando página" />,
  errorComponent: RouteError,
  notFoundComponent: () => (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="mt-2 text-muted-foreground">O endereço não existe neste marketplace.</p>
      <Link to="/" className="mt-6 inline-block text-primary underline">
        Voltar ao início
      </Link>
    </div>
  ),
})

function RootComponent() {
  return (
    <AppProviders>
      <div className="flex min-h-dvh flex-col">
        <AppHeader />
        <main className="flex-1">
          <Outlet />
        </main>
        <MobileDock />
        <AppFooter />
      </div>
    </AppProviders>
  )
}

function RouteError({ error }: { error: unknown }) {
  const router = useRouter()
  return <QueryError error={error} retry={() => { void router.invalidate() }} />
}
