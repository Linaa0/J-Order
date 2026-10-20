import Link from 'next/link'
import { GearLogo } from '@/components/branding/GearLogo'
import { Button } from '@/components/ui/Button'
import { useTranslations } from 'next-intl'

export default function NotFoundPage() {
  const tAuth = useTranslations('auth')
  const tErrors = useTranslations('errors')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl bg-white p-8 border border-gray-200 shadow-sm text-center">
        <GearLogo className="mx-auto mb-6" iconClassName="h-10 w-14" wordmarkClassName="text-2xl" />
        <h1 className="font-body text-4xl font-bold text-navy-900 mb-2">404</h1>
        <p className="text-gray-600 mb-6 text-sm">{tErrors('notFound')}</p>
        <Link href="/">
          <Button variant="primary" className="w-full">{tAuth('goHome')}</Button>
        </Link>
      </div>
    </div>
  )
}
