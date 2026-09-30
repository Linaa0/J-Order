import Link from 'next/link'
import { GearLogo } from '@/components/branding/GearLogo'
import { Button } from '@/components/ui/Button'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-navy-gradient flex items-center justify-center px-4">
      <div className="text-center text-white max-w-sm">
        <GearLogo dark className="mx-auto mb-6 opacity-90" iconClassName="h-14 w-[4.5rem]" wordmarkClassName="text-3xl" />
        <h1 className="font-display text-5xl font-bold mb-3">404</h1>
        <p className="text-navy-300 mb-6">The page you are looking for does not exist.</p>
        <Link href="/">
          <Button>Go Home</Button>
        </Link>
      </div>
    </div>
  )
}
