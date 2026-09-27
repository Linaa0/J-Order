export type ContactType = 'email' | 'phone'

export function detectContactType(value: string): ContactType {
  const cleaned = value.trim()
  return cleaned.includes('@') ? 'email' : 'phone'
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''

  if (digits.startsWith('250')) {
    return `+${digits}`
  }

  if (digits.startsWith('0')) {
    return `+250${digits.slice(1)}`
  }

  if (digits.length >= 9) {
    return `+${digits}`
  }

  return `+${digits}`
}

export function getDisplayContact(value: string, type: ContactType): string {
  if (type === 'email') return normalizeEmail(value)
  return normalizePhone(value)
}

export function resolveAuthContact(
  rawContact: string | null,
  rawType: string | null,
  fallbackContact?: string | null
): { contact: string; type: ContactType } {
  const contact = rawContact || fallbackContact || ''
  const type = rawType === 'email' ? 'email' : detectContactType(contact)
  return {
    contact,
    type,
  }
}
