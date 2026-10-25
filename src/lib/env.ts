import { z } from 'zod'

const baseEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL').optional(),
  OTP_SECRET: z.string().min(16, 'OTP_SECRET is required (min 16 chars)').optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().optional(),
  AT_API_KEY: z.string().optional(),
  AT_USERNAME: z.string().optional(),
  AT_SENDER_ID: z.string().optional(),
})

const productionEnvSchema = baseEnvSchema.extend({
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL in production'),
  OTP_SECRET: z.string().min(16, 'OTP_SECRET is required in production (min 16 chars)'),
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required in production'),
  RESEND_FROM: z.string().min(1, 'RESEND_FROM is required in production'),
  AT_API_KEY: z.string().min(1, 'AT_API_KEY is required in production'),
  AT_USERNAME: z.string().min(1, 'AT_USERNAME is required in production'),
})

export function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production'
  const schema = isProd ? productionEnvSchema : baseEnvSchema

  const result = schema.safeParse(process.env)

  if (!result.success) {
    const missingKeys = result.error.issues.map((issue) => issue.path.join('.')).filter(Boolean)
    const message = `Environment validation failed. Missing or invalid required environment variable(s): ${missingKeys.join(', ')}`
    console.error(`[ENV ERROR] ${message}`)
    if (isProd) {
      throw new Error(message)
    }
  }

  return result.data
}

export const env = validateEnv()
