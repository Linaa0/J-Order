import { GearLogo } from '@/components/branding/GearLogo'
import { useTranslations } from 'next-intl'

export default function LoadingPage() {
  const t = useTranslations('common')
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <GearLogo animated layout="stacked" className="mb-4" iconClassName="h-12 w-16" wordmarkClassName="text-3xl" />
        <p className="text-gray-500 text-sm font-medium">{t('loading')}</p>
      </div>
    </div>
  )
}
