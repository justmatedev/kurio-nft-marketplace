import { cn } from '@/shared/lib/utils'

export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('skeleton-shimmer rounded-md bg-muted', className)}
      aria-hidden
      {...props}
    />
  )
}
