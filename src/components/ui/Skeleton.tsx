import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-xl bg-navy-100', className)}
      {...props}
    />
  )
}

export function OrderCardSkeleton() {
  return (
    <div className="rounded-2xl border border-navy-100 p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-3 w-48" />
      <Skeleton className="h-8 w-full rounded-xl" />
    </div>
  )
}
