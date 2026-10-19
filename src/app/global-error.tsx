'use client'
import { useTranslations } from 'next-intl'
import { GearLogo } from '@/components/branding/GearLogo'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('errors')

  return (
    <html lang="en">
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
          <GearLogo dark className="mx-auto mb-6 opacity-90" iconClassName="h-14 w-[4.5rem]" wordmarkClassName="text-3xl" />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            {t('generic')}
          </h1>
          <p style={{ color: '#7881ca', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {t('errorDescription')}
          </p>
          <button
            onClick={reset}
            style={{
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '0.75rem',
              padding: '0.75rem 2rem',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            {t('retry')}
          </button>
        </div>
      </body>
    </html>
  )
}
