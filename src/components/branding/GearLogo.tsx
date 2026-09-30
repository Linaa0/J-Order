'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'

interface GearLogoProps {
  className?: string
  iconClassName?: string
  wordmarkClassName?: string
  layout?: 'horizontal' | 'stacked'
  animated?: boolean
  dark?: boolean
  showWordmark?: boolean
}

function Gear({
  x,
  y,
  radius,
  teeth,
  color,
  animate,
  duration,
  reverse = false,
}: {
  x: number
  y: number
  radius: number
  teeth: number
  color: string
  animate: boolean
  duration: number
  reverse?: boolean
}) {
  const points: string[] = []
  const steps = teeth * 4
  for (let index = 0; index < steps; index += 1) {
    const angle = (Math.PI * 2 * index) / steps - Math.PI / 2
    const depth = index % 4 === 1 || index % 4 === 2 ? 1 : 0.84
    points.push(`${(x + Math.cos(angle) * radius * depth).toFixed(2)},${(y + Math.sin(angle) * radius * depth).toFixed(2)}`)
  }

  return (
    <g className={animate ? 'gear-logo__spin' : undefined} style={{ transformBox: 'view-box', transformOrigin: `${x}px ${y}px`, animationDuration: `${duration}s`, animationDirection: reverse ? 'reverse' : 'normal' }}>
      <polygon points={points.join(' ')} fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx={x} cy={y} r={radius * 0.55} fill="none" stroke={color} strokeWidth="2.2" />
      <circle cx={x} cy={y} r="1.7" fill={color} />
    </g>
  )
}

export function GearLogo({
  className,
  iconClassName,
  wordmarkClassName,
  layout = 'horizontal',
  animated = false,
  dark = false,
  showWordmark = true,
}: GearLogoProps) {
  const id = useId().replace(/:/g, '')
  const primary = dark ? '#f8fafc' : '#0b1b3a'
  const stacked = layout === 'stacked'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2.5',
        stacked && 'flex-col gap-3',
        className,
      )}
      role="img"
      aria-label="J Order"
    >
      <svg
        className={cn('h-9 w-9 shrink-0 overflow-visible', iconClassName)}
        viewBox="0 0 64 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`${id}-ember`} x1="8" y1="7" x2="30" y2="39" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fbbf24" />
            <stop offset="1" stopColor="#ea580c" />
          </linearGradient>
        </defs>
        <Gear x={22} y={24} radius={15} teeth={8} color={`url(#${id}-ember)`} animate={animated} duration={16} />
        <Gear x={44} y={24} radius={11} teeth={8} color={primary} animate={animated} duration={12} reverse />
      </svg>
      {showWordmark && (
        <span
          className={cn(
            'whitespace-nowrap font-semibold leading-none',
            dark ? 'text-white' : 'text-navy-900',
            stacked ? 'text-3xl' : 'text-xl',
            wordmarkClassName,
          )}
          style={{ fontFamily: '"Space Grotesk", "General Sans", sans-serif' }}
        >
          <span className="text-ember-500">J</span> Order
        </span>
      )}
      <style jsx global>{`
        .gear-logo__spin {
          animation-name: gear-turn;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        @keyframes gear-turn {
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .gear-logo__spin { animation: none !important; }
        }
      `}</style>
    </span>
  )
}