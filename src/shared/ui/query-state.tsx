import { Skeleton } from './skeleton'
import { getApiError } from '@/shared/api/client'
export function QueryLoading({ label }: { label: string }) {
  return <div className="mx-auto max-w-5xl space-y-5 p-6" role="status" aria-label={label}><Skeleton className="h-10 w-2/3" /><Skeleton className="h-80 w-full" /><span className="sr-only">{label}</span></div>
}
export function QueryError({ error, retry }: { error: unknown; retry: () => void }) {
  return <div className="mx-auto max-w-xl space-y-4 p-8" role="alert"><p>{getApiError(error).message}</p><button className="rounded border border-primary px-4 py-2 text-primary" onClick={retry}>Tentar novamente</button></div>
}
export function focusFirstError() {
  requestAnimationFrame(() => Array.from(document.querySelectorAll<HTMLElement>('[aria-invalid="true"]')).find(el => el.offsetParent !== null)?.focus())
}

export function QueryRefresh({ fetching, error, retry }: { fetching: boolean; error?: unknown; retry: () => void }) {
  if (error) return <div role="alert" className="my-3 text-sm text-destructive">Não foi possível atualizar. Seus dados continuam aqui. <button className="underline" onClick={retry}>Tentar novamente</button></div>
  return <span role="status" className="sr-only">{fetching ? 'Atualizando dados…' : ''}</span>
}
