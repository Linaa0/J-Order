'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { GearLogo } from './GearLogo'

interface BrandLoadingProps {
  className?: string
  inline?: boolean
}

export function BrandLoading({ className, inline = false }: BrandLoadingProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 text-center',
        inline ? 'gap-3' : 'min-h-[220px]',
        className
      )}
    >
      <GearLogo
        animated
        dark={!inline}
        layout="stacked"
        iconClassName={inline ? 'h-10 w-14' : 'h-14 w-[4.5rem]'}
        wordmarkClassName={inline ? 'text-2xl' : 'text-4xl'}
      />

      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-200">
        <motion.div
          className="h-full w-1/3 rounded-full bg-orange-600"
          animate={{ x: ['-100%', '300%'] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>
  )
}
