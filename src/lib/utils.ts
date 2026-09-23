import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function randomChars(len: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = randomChars(4)
  return `GES${timestamp}${random}`
}

export function formatDate(date: Date | string, locale = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

export function formatDateTime(date: Date | string, locale = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('250') && cleaned.length === 12) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`
  }
  return phone
}

export function sanitizePhone(phone: string): string {
  let cleaned = phone.replace(/\s/g, '')
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = `+250${cleaned.slice(1)}`
  } else if (cleaned.startsWith('250') && !cleaned.startsWith('+')) {
    cleaned = `+${cleaned}`
  }
  return cleaned
}
