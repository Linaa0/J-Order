import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

/**
 * Generates a 6-digit numeric OTP code.
 */
export function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString()
}

/**
 * Computes an HMAC-SHA256 hash of the 6-digit OTP code using OTP_SECRET or NEXTAUTH_SECRET.
 * This ensures plain-text codes are never stored in the database.
 */
export function hashOtp(code: string): string {
  const secret = process.env.OTP_SECRET || process.env.NEXTAUTH_SECRET || 'jorder-otp-secret-fallback'
  return crypto.createHmac('sha256', secret).update(code.trim()).digest('hex')
}

/**
 * Constant-time comparison between stored HMAC hash (or legacy plain-text code) and incoming plain-text OTP code.
 */
export function verifyOtpHash(storedCode: string, incomingCode: string): boolean {
  if (!storedCode || !incomingCode) return false
  const trimmed = incomingCode.trim()

  // Primary: stored code is HMAC-SHA256 hex (64 chars)
  if (storedCode.length === 64) {
    const incomingHash = hashOtp(trimmed)
    const storedBuf = Buffer.from(storedCode, 'hex')
    const incomingBuf = Buffer.from(incomingHash, 'hex')

    if (storedBuf.length !== incomingBuf.length) {
      return false
    }

    return crypto.timingSafeEqual(storedBuf, incomingBuf)
  }

  // Fallback for legacy plain-text codes if any exist
  const storedBuf = Buffer.from(storedCode.trim(), 'utf8')
  const incomingBuf = Buffer.from(trimmed, 'utf8')
  if (storedBuf.length !== incomingBuf.length) return false
  return crypto.timingSafeEqual(storedBuf, incomingBuf)
}

// In-memory fallback if database raw queries are disabled or in unit tests
const memoryRateMap = new Map<string, number[]>()

/**
 * Database-backed rate limiting per key (e.g. IP or contact) for serverless environments.
 * Checks and records attempts within a sliding time window.
 */
export async function checkDatabaseRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now()
  const windowStart = new Date(now - windowMs)

  try {
    // Lazily ensure table exists without requiring schema changes
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "_rate_limits" (
        "id" SERIAL PRIMARY KEY,
        "key" VARCHAR(255) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS "_rate_limits_key_idx" ON "_rate_limits" ("key", "created_at");
    `)

    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count FROM "_rate_limits" WHERE "key" = $1 AND "created_at" >= $2`,
      key,
      windowStart
    )

    const count = Number(result[0]?.count ?? 0)
    if (count >= maxAttempts) {
      return { allowed: false, remaining: 0 }
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO "_rate_limits" ("key", "created_at") VALUES ($1, NOW())`,
      key
    )

    return { allowed: true, remaining: maxAttempts - count - 1 }
  } catch (error) {
    // Fall back to in-memory window when testing or if DB raw query is not permitted
    const timestamps = memoryRateMap.get(key) || []
    const validTimestamps = timestamps.filter((t) => t > now - windowMs)

    if (validTimestamps.length >= maxAttempts) {
      return { allowed: false, remaining: 0 }
    }

    validTimestamps.push(now)
    memoryRateMap.set(key, validTimestamps)
    return { allowed: true, remaining: maxAttempts - validTimestamps.length }
  }
}
