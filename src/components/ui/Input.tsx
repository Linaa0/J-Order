'use client'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  required?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, required, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '_')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-navy-800">
            {label}
            {required && <span className="text-red-500 ml-1" aria-hidden>*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}_error` : hint ? `${inputId}_hint` : undefined}
          className={cn(
            'h-12 w-full rounded-xl border-2 bg-white px-4 text-navy-900 placeholder-navy-300',
            'transition-all duration-200',
            'focus:outline-none focus:border-ember-700 focus:ring-2 focus:ring-ember-700/20',
            error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-navy-200',
            className
          )}
          {...props}
        />
        {error && (
          <p id={`${inputId}_error`} className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}_hint`} className="text-sm text-navy-400">
            {hint}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
