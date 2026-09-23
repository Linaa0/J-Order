'use client'
import { cn } from '@/lib/utils'

interface IconProps {
  className?: string
  size?: number
}

export function GasRefillIcon({ className, size = 48 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect x="16" y="10" width="16" height="28" rx="4" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M20 10V8h8v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M24 20 C22 22 22 26 24 28 C26 26 26 22 24 20Z" fill="currentColor" opacity="0.6"/>
      <path d="M24 16 C20 20 20 30 24 33 C28 30 28 20 24 16Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M20 38h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="34" cy="14" r="4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M34 12v2l1 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function Cylinder6KgIcon({ className, size = 48 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <ellipse cx="24" cy="12" rx="10" ry="3" stroke="currentColor" strokeWidth="2"/>
      <path d="M14 12v24" stroke="currentColor" strokeWidth="2"/>
      <path d="M34 12v24" stroke="currentColor" strokeWidth="2"/>
      <ellipse cx="24" cy="36" rx="10" ry="3" stroke="currentColor" strokeWidth="2"/>
      <path d="M20 8h8v4h-8z" fill="currentColor" opacity="0.3"/>
      <path d="M21 8v-2h6v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <text x="24" y="26" textAnchor="middle" fontSize="8" fontWeight="bold" fill="currentColor">6</text>
      <text x="24" y="33" textAnchor="middle" fontSize="6" fill="currentColor">kg</text>
    </svg>
  )
}

export function Cylinder12KgIcon({ className, size = 48 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <ellipse cx="24" cy="10" rx="12" ry="3.5" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 10v28" stroke="currentColor" strokeWidth="2"/>
      <path d="M36 10v28" stroke="currentColor" strokeWidth="2"/>
      <ellipse cx="24" cy="38" rx="12" ry="3.5" stroke="currentColor" strokeWidth="2"/>
      <path d="M20 7h8v3h-8z" fill="currentColor" opacity="0.3"/>
      <path d="M22 7v-2h4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <text x="24" y="26" textAnchor="middle" fontSize="8" fontWeight="bold" fill="currentColor">12</text>
      <text x="24" y="34" textAnchor="middle" fontSize="6" fill="currentColor">kg</text>
    </svg>
  )
}

export function Cylinder20KgIcon({ className, size = 48 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <ellipse cx="24" cy="10" rx="13" ry="4" stroke="currentColor" strokeWidth="2"/>
      <path d="M11 10v28" stroke="currentColor" strokeWidth="2"/>
      <path d="M37 10v28" stroke="currentColor" strokeWidth="2"/>
      <ellipse cx="24" cy="38" rx="13" ry="4" stroke="currentColor" strokeWidth="2"/>
      <path d="M20 6.5h8v3.5h-8z" fill="currentColor" opacity="0.3"/>
      <path d="M22 6.5v-2h4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <text x="24" y="26" textAnchor="middle" fontSize="8" fontWeight="bold" fill="currentColor">20</text>
      <text x="24" y="34" textAnchor="middle" fontSize="6" fill="currentColor">kg</text>
    </svg>
  )
}

export function Cylinder38KgIcon({ className, size = 48 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <ellipse cx="24" cy="9" rx="14" ry="4.5" stroke="currentColor" strokeWidth="2"/>
      <path d="M10 9v30" stroke="currentColor" strokeWidth="2"/>
      <path d="M38 9v30" stroke="currentColor" strokeWidth="2"/>
      <ellipse cx="24" cy="39" rx="14" ry="4.5" stroke="currentColor" strokeWidth="2"/>
      <path d="M20 5h8v4h-8z" fill="currentColor" opacity="0.3"/>
      <path d="M22 5v-2h4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <text x="24" y="26" textAnchor="middle" fontSize="8" fontWeight="bold" fill="currentColor">38</text>
      <text x="24" y="34" textAnchor="middle" fontSize="6" fill="currentColor">kg</text>
    </svg>
  )
}

export function FlameIcon({ className, size = 48 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M24 4 C20 12 14 16 16 26 C18 32 24 36 24 36 C24 36 30 32 32 26 C34 16 28 12 24 4Z" fill="url(#flame1)" opacity="0.9"/>
      <path d="M24 16 C22 20 19 22 20 28 C21 31 24 33 24 33 C24 33 27 31 28 28 C29 22 26 20 24 16Z" fill="url(#flame2)"/>
      <path d="M24 24 C23 26 22 27 22.5 29 C23 30.5 24 31 24 31 C24 31 25 30.5 25.5 29 C26 27 25 26 24 24Z" fill="white" opacity="0.7"/>
      <defs>
        <linearGradient id="flame1" x1="24" y1="4" x2="24" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffa000"/>
          <stop offset="0.6" stopColor="#f97316"/>
          <stop offset="1" stopColor="#ea580c"/>
        </linearGradient>
        <linearGradient id="flame2" x1="24" y1="16" x2="24" y2="33" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff176"/>
          <stop offset="1" stopColor="#ffa000"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

export function getProductIcon(product: string, props?: IconProps) {
  const iconMap: Record<string, (p?: IconProps) => JSX.Element> = {
    GAS_REFILL: (p) => <GasRefillIcon {...p} />,
    CYLINDER_6KG: (p) => <Cylinder6KgIcon {...p} />,
    CYLINDER_12KG: (p) => <Cylinder12KgIcon {...p} />,
    CYLINDER_20KG: (p) => <Cylinder20KgIcon {...p} />,
    CYLINDER_38KG: (p) => <Cylinder38KgIcon {...p} />,
  }
  return iconMap[product]?.(props) ?? <GasRefillIcon {...props} />
}
