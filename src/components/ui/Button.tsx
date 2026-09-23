'use client'
import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-700 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-ember-gradient text-white shadow-ember hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]',
        secondary:
          'bg-navy-800 text-white hover:bg-navy-700 active:bg-navy-900',
        outline:
          'border-2 border-navy-800 text-navy-800 hover:bg-navy-800 hover:text-white',
        ghost:
          'text-navy-800 hover:bg-navy-50',
        danger:
          'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-12 px-6 text-base',
        lg: 'h-14 px-8 text-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        {...(props as React.ComponentProps<typeof motion.button>)}
      >
        {loading ? (
          <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
        ) : null}
        {children}
      </motion.button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
