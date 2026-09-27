'use client'

import { cn } from '@/lib/utils'

interface WordmarkProps {
  className?: string
  compact?: boolean
  dark?: boolean
}

export function Wordmark({ className, compact = false, dark = false }: WordmarkProps) {
  return (
    <div
      className={cn('inline-flex items-end leading-none tracking-[-0.06em]', className)}
      aria-label="J Order"
    >
      <span
        className={cn(
          'font-black',
          compact ? 'text-[1.45rem] sm:text-[1.7rem]' : 'text-[2.2rem] sm:text-[3.2rem] md:text-[4rem]',
          dark ? 'text-white' : 'text-navy-900'
        )}
        style={{ fontFamily: '"Space Grotesk", "General Sans", sans-serif', letterSpacing: '-0.08em' }}
      >
        <span className={dark ? 'text-ember-400' : 'text-ember-700'}>J</span>
        <span className={dark ? 'text-white' : 'text-navy-900'}> Order</span>
      </span>
    </div>
  )
}
