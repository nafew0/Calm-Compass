import { cn } from '@/lib/utils'

export function Skeleton({ className = '' }) {
  return <div className={cn('animate-pulse rounded-lg bg-[rgb(var(--theme-neutral-strong-rgb))]', className)} />
}
