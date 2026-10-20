'use client'
import { useTranslations } from 'next-intl'
import { GearLogo } from '@/components/branding/GearLogo'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const tErrors = useTranslations('errors')
  const tCommon = useTranslations('common')

  return (
    <html lang="en">
      <body
        style={{
          minHeight: '100vh',
          backgroundColor: '#f9fafb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          color: '#0f172a',
          textAlign: 'center',
          padding: '1rem',
          margin: 0,
        }}
      >
        <div
          style={{
            maxWidth: '28rem',
            width: '100%',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '0.75rem',
            padding: '2rem',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          <GearLogo className="mx-auto mb-6" iconClassName="h-10 w-14" wordmarkClassName="text-2xl" />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: '#0f172a' }}>
            {tErrors('generic')}
          </h1>
          <p style={{ color: '#4b5563', marginBottom: '1.5rem', fontSize: '0.875rem', lineHeight: '1.5' }}>
            {tErrors('errorDescription')}
          </p>
          <button
            onClick={reset}
            style={{
              width: '100%',
              backgroundColor: '#ea580c',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.75rem 1.25rem',
              fontWeight: 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            {tCommon('retry')}
          </button>
        </div>
      </body>
    </html>
  )
}
