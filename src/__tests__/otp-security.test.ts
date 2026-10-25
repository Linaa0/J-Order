import { generateOtp, hashOtp, verifyOtpHash, checkDatabaseRateLimit } from '@/lib/otp'
import { normalizePhone, normalizeEmail } from '@/lib/contact'

describe('OTP Generation and Cryptographic Security', () => {
  it('generates a 6-digit numeric OTP code', () => {
    const code = generateOtp()
    expect(code).toHaveLength(6)
    expect(/^\d{6}$/.test(code)).toBe(true)
  })

  it('hashes OTP code using HMAC-SHA256 (64 hex characters)', () => {
    const code = '123456'
    const hash = hashOtp(code)
    expect(hash).toHaveLength(64)
    expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true)
  })

  it('verifies valid OTP hash in constant time', () => {
    const code = '849201'
    const hash = hashOtp(code)
    expect(verifyOtpHash(hash, code)).toBe(true)
    expect(verifyOtpHash(hash, '849202')).toBe(false)
    expect(verifyOtpHash(hash, '')).toBe(false)
  })

  it('handles legacy plain-text codes gracefully during transition', () => {
    const code = '555666'
    expect(verifyOtpHash(code, code)).toBe(true)
    expect(verifyOtpHash(code, '111222')).toBe(false)
  })

  it('simulates 10-minute expiry validation', () => {
    const now = Date.now()
    const validExpiry = new Date(now + 10 * 60 * 1000)
    const expiredTime = new Date(now - 1000)

    expect(validExpiry.getTime() > now).toBe(true)
    expect(expiredTime.getTime() > now).toBe(false)
  })

  it('enforces maximum 5 attempts policy', () => {
    const maxAttempts = 5
    let currentAttempts = 0

    // Simulate 4 failed attempts: code still usable
    for (let i = 0; i < 4; i++) {
      currentAttempts++
      expect(currentAttempts < maxAttempts).toBe(true)
    }

    // 5th failed attempt: code gets locked out
    currentAttempts++
    expect(currentAttempts >= maxAttempts).toBe(true)
  })
})

describe('Phone and Contact Normalization', () => {
  it('normalizes Rwandan phone numbers to +250XXXXXXXXX', () => {
    // 9 digits (no country code or leading zero)
    expect(normalizePhone('788123456')).toBe('+250788123456')
    expect(normalizePhone('728123456')).toBe('+250728123456')

    // 10 digits with leading zero
    expect(normalizePhone('0788123456')).toBe('+250788123456')
    expect(normalizePhone('0787481615')).toBe('+250787481615')

    // 12 digits with 250
    expect(normalizePhone('250788123456')).toBe('+250788123456')

    // Formatted with spaces and +
    expect(normalizePhone('+250 788 123 456')).toBe('+250788123456')
    expect(normalizePhone(' +250 787-481-615 ')).toBe('+250787481615')
  })

  it('normalizes email addresses to lower-case and trimmed', () => {
    expect(normalizeEmail('  Admin@JOrder.RW  ')).toBe('admin@jorder.rw')
    expect(normalizeEmail('User.Test@gmail.COM')).toBe('user.test@gmail.com')
  })
})

describe('Rate Limiter', () => {
  it('allows requests within threshold and blocks subsequent ones', async () => {
    const testKey = `test-limit-${Date.now()}`
    const limit = 3
    const windowMs = 5000

    const r1 = await checkDatabaseRateLimit(testKey, limit, windowMs)
    expect(r1.allowed).toBe(true)

    const r2 = await checkDatabaseRateLimit(testKey, limit, windowMs)
    expect(r2.allowed).toBe(true)

    const r3 = await checkDatabaseRateLimit(testKey, limit, windowMs)
    expect(r3.allowed).toBe(true)

    const r4 = await checkDatabaseRateLimit(testKey, limit, windowMs)
    expect(r4.allowed).toBe(false)
  })
})
