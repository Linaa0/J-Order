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

  // 12 digits: e.g. 250788123456
  if (digits.startsWith('250') && digits.length === 12) {
    return `+${digits}`
  }

  // 10 digits starting with 0: e.g. 0788123456 -> +250788123456
  if (digits.startsWith('0') && digits.length === 10) {
    return `+250${digits.slice(1)}`
  }

  // 9 digits starting with 7: e.g. 788123456 -> +250788123456
  if (digits.length === 9 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return `+250${digits}`
  }

  // Fallback: if already starts with 250
  if (digits.startsWith('250')) {
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
