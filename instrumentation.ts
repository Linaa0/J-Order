function validateMessagingConfig() {
  const warnings: string[] = []

  if (!process.env.RESEND_API_KEY) {
    warnings.push('RESEND_API_KEY is missing. Email delivery will fail until it is set.')
  }

  if (!process.env.RESEND_FROM) {
    warnings.push('RESEND_FROM is missing. Set a verified sender address for email delivery.')
  }

  if (!process.env.AT_API_KEY) {
    warnings.push('AT_API_KEY is missing. SMS and WhatsApp delivery will fail until it is set.')
  }

  if (!process.env.AT_USERNAME) {
    warnings.push('AT_USERNAME is missing. Africa\'s Talking credentials are incomplete.')
  }

  if (!process.env.AT_SENDER_ID) {
    warnings.push('AT_SENDER_ID is missing. SMS delivery will fail without an approved sender ID or shortcode.')
  }

  if (!process.env.AT_WHATSAPP_NUMBER && !process.env.AT_SENDER_ID) {
    warnings.push('AT_WHATSAPP_NUMBER is missing. WhatsApp delivery needs a business approved WhatsApp number.')
  }

  if (warnings.length > 0) {
    console.warn('[J-Order Messaging] Startup warning: ' + warnings.join(' | '))
  }
}

export async function register() {
  validateMessagingConfig()

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { default: Sentry } = await import('@sentry/nextjs')
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 1.0,
      debug: false,
    })
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    const { default: Sentry } = await import('@sentry/nextjs')
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 1.0,
      debug: false,
    })
  }
}
