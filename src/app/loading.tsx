import { GearLogo } from '@/components/branding/GearLogo'
import { useTranslations } from 'next-intl'

export default function LoadingPage() {
  const t = useTranslations('common')
  return (
    <div className="min-h-screen bg-navy-gradient flex items-center justify-center">
      <div className="text-center text-white">
        <GearLogo dark animated layout="stacked" className="mb-5" iconClassName="h-14 w-[4.5rem]" wordmarkClassName="text-3xl" />
        <p className="text-navy-300">{t('loading')}</p>
      </div>
    </div>
  )
}
