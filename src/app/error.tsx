'use client'
import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/Button'
import { FlameIcon } from '@/components/icons/ProductIcons'

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
        <FlameIcon size={56} className="mx-auto mb-6 opacity-70" />
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
