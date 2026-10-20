import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean
}

export function Card({ className, elevated: _elevated, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl bg-white p-6 border border-gray-200 shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
