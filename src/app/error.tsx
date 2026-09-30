'use client'
import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/Button'
import { GearLogo } from '@/components/branding/GearLogo'

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

  return (
    <div className="min-h-screen bg-navy-gradient flex items-center justify-center px-4">
      <div className="text-center text-white max-w-sm">
        <GearLogo dark className="mx-auto mb-6 opacity-90" iconClassName="h-14 w-[4.5rem]" wordmarkClassName="text-3xl" />
        <h1 className="font-display text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-navy-300 mb-6 text-sm">
          An unexpected error occurred. Our team has been notified and will fix it soon.
        </p>
        <Button onClick={reset} variant="primary">
          Try Again
        </Button>
      </div>
    </div>
  )
}
