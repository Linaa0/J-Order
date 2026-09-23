'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Phone } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FlameIcon } from '@/components/icons/ProductIcons'
import { sanitizePhone } from '@/lib/utils'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!phone.trim()) {
      setError('Phone number is required')
      return
    }
    setLoading(true)
    try {
      const cleanPhone = sanitizePhone(phone)
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to send code')
        return
      }
      sessionStorage.setItem('jorder_phone', cleanPhone)
      sessionStorage.setItem('jorder_new_user', data.isNewUser ? 'true' : 'false')
      router.push('/verify')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-gradient flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <FlameIcon size={56} className="mx-auto mb-4" />
          <h1 className="font-display text-3xl font-bold text-white mb-2">Welcome to J Order</h1>
          <p className="text-navy-300">Enter your phone number to continue</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-navy">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400">
                <Phone size={18} />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+250 7XX XXX XXX"
                className="h-12 w-full rounded-xl border-2 border-navy-200 bg-white pl-10 pr-4 text-navy-900 placeholder-navy-300 focus:outline-none focus:border-ember-700 focus:ring-2 focus:ring-ember-700/20 transition-all"
                aria-label="Phone number"
                autoComplete="tel"
                inputMode="tel"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600" role="alert">{error}</p>
            )}
            <Button type="submit" loading={loading} className="w-full" size="lg">
              Send Verification Code
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t border-navy-100">
            <button
              onClick={() => router.push('/order/new?guest=1')}
              className="w-full text-center text-sm text-navy-500 hover:text-navy-800 transition-colors py-2"
            >
              Continue as Guest
            </button>
          </div>
        </div>

        <p className="text-center text-navy-400 text-sm mt-6">
          Gas Engineering and Services Ltd · Gasabo, Kigali
        </p>
      </motion.div>
    </div>
  )
}
