import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean
}

export function Card({ className, elevated, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-white p-5',
        elevated ? 'shadow-navy' : 'border border-navy-100',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
