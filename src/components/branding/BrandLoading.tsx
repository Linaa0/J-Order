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

      <div className="relative overflow-hidden rounded-full px-2 py-1">
        <motion.div
          className="absolute inset-y-0 left-[-30%] w-[30%] bg-gradient-to-r from-transparent via-ember-200/80 to-transparent"
          animate={{ x: ['0%', '170%'] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <motion.div
        className={cn('h-1.5 w-24 overflow-hidden rounded-full', inline ? 'bg-navy-200' : 'bg-white/10')}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <motion.div
          className="h-full w-1/3 rounded-full bg-ember-gradient"
          animate={{ x: ['-100%', '300%'] }}
          transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
    </div>
  )
}
