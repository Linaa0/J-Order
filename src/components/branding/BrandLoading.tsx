'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Wordmark } from './Wordmark'

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
      <div className="relative flex items-center justify-center">
        <motion.div
          className="absolute h-16 w-16 rounded-full bg-ember-400/25 blur-2xl"
          animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="relative h-8 w-8 rounded-full bg-ember-gradient shadow-ember"
          animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative overflow-hidden rounded-full px-2 py-1">
        <motion.div
          className="absolute inset-y-0 left-[-30%] w-[30%] bg-gradient-to-r from-transparent via-ember-200/80 to-transparent"
          animate={{ x: ['0%', '170%'] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <Wordmark dark={!inline} className={inline ? 'justify-center text-navy-900' : 'justify-center'} compact={inline} />
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
