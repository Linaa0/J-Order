export async function register() {
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
