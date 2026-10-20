'use client'
import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/Button'
import { GearLogo } from '@/components/branding/GearLogo'
import { useTranslations } from 'next-intl'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  const tErrors = useTranslations('errors')
  const tCommon = useTranslations('common')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl bg-white p-8 border border-gray-200 shadow-sm text-center">
        <GearLogo className="mx-auto mb-6" iconClassName="h-10 w-14" wordmarkClassName="text-2xl" />
        <h1 className="font-body text-xl font-bold text-navy-900 mb-2">{tErrors('generic')}</h1>
        <p className="text-gray-600 mb-6 text-sm leading-relaxed">
          {tErrors('errorDescription')}
        </p>
        <Button onClick={reset} variant="primary" className="w-full">
          {tCommon('retry')}
        </Button>
      </div>
    </div>
  )
}
