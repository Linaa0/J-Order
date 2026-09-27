import { detectContactType, normalizeEmail, normalizePhone, resolveAuthContact } from '@/lib/contact'

describe('Contact helpers', () => {
  it('detects email addresses', () => {
    expect(detectContactType('hello@example.com')).toBe('email')
  })

  it('detects phone numbers', () => {
    expect(detectContactType('0788123456')).toBe('phone')
    expect(detectContactType('+250788123456')).toBe('phone')
  })

  it('normalizes email correctly', () => {
    expect(normalizeEmail('  Hello@Example.com  ')).toBe('hello@example.com')
  })

  it('normalizes phone numbers consistently', () => {
    expect(normalizePhone('0788123456')).toBe('+250788123456')
    expect(normalizePhone('+250 788 123 456')).toBe('+250788123456')
  })

  it('resolves the stored auth contact regardless of the key used', () => {
    expect(resolveAuthContact('deenovdunya01@gmail.com', 'email', null)).toEqual({
      contact: 'deenovdunya01@gmail.com',
      type: 'email',
    })

    expect(resolveAuthContact(null, null, '+250787481615')).toEqual({
      contact: '+250787481615',
      type: 'phone',
    })
  })
})
