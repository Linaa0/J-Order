import { FlameIcon } from '@/components/icons/ProductIcons'

export default function LoadingPage() {
  return (
    <div className="min-h-screen bg-navy-gradient flex items-center justify-center">
      <div className="text-center text-white">
        <div className="animate-flame-flicker mb-4 flex justify-center">
          <FlameIcon size={56} />
        </div>
        <p className="text-navy-300">Loading...</p>
      </div>
    </div>
  )
}
