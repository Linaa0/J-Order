'use client'

import { GearLogo } from './GearLogo'

interface WordmarkProps {
  className?: string
  compact?: boolean
  dark?: boolean
}

export function Wordmark({ className, compact = false, dark = false }: WordmarkProps) {
  return (
    <GearLogo
      className={className}
      iconClassName={compact ? 'h-7 w-9' : 'h-10 w-14'}
      wordmarkClassName={compact ? 'text-2xl' : 'text-4xl sm:text-5xl'}
      dark={dark}
    />
  )
}
