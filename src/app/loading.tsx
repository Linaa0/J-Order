import { GearLogo } from '@/components/branding/GearLogo'

export default function LoadingPage() {
  return (
    <div className="min-h-screen bg-navy-gradient flex items-center justify-center">
      <div className="text-center text-white">
        <GearLogo dark animated layout="stacked" className="mb-5" iconClassName="h-14 w-[4.5rem]" wordmarkClassName="text-3xl" />
        <p className="text-navy-300">Loading...</p>
      </div>
    </div>
  )
}
