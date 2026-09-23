'use client'
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #060d40 0%, #0d1b5e 50%, #1a2a7c 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          color: 'white',
          textAlign: 'center',
          padding: '1.5rem',
        }}
      >
        <div>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔥</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#7881ca', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            An unexpected error occurred. Our team has been notified.
          </p>
          <button
            onClick={reset}
            style={{
              background: 'linear-gradient(135deg, #ffa000, #f97316, #ea580c)',
              color: 'white',
              border: 'none',
              borderRadius: '0.75rem',
              padding: '0.75rem 2rem',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  )
}
