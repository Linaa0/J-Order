'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Mail, MessageSquareText, Phone, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Wordmark } from '@/components/branding/Wordmark'
import { detectContactType, normalizeEmail } from '@/lib/contact'
import { sanitizePhone } from '@/lib/utils'

type DeliveryMethod = 'sms' | 'whatsapp'
type LoginMethod = 'code' | 'password'

export default function LoginPage() {
  const router = useRouter()
  const [contact, setContact] = useState('')
  const [contactType, setContactType] = useState<'email' | 'phone'>('phone')
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('sms')
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('code')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEmailLookup = useMemo(() => contactType === 'email' || contact.includes('@'), [contact, contactType])

  function setContactValue(value: string) {
    setContact(value)
    const nextType = detectContactType(value)
    if (nextType !== 'phone' || value.includes('@')) {
      setContactType(nextType)
    }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const trimmed = contact.trim()

    if (!trimmed || !password.trim()) {
      setError('Email or phone number and password are required')
      return
    }

    setLoading(true)
    try {
      const result = await signIn('credentials', {
        contact: trimmed,
        password: password.trim(),
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email, phone number, or password')
        return
      }

      router.push('/')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const trimmed = contact.trim()

    if (!trimmed) {
      setError('Email or phone number is required')
      return
    }

    if (isEmailLookup) {
      const email = normalizeEmail(trimmed)
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('Please enter a valid email address')
        return
      }
    } else {
      const phone = sanitizePhone(trimmed)
      if (!phone || phone.length < 10) {
        setError('Please enter a valid phone number')
        return
      }
    }

    setLoading(true)
    try {
      const payload = isEmailLookup
        ? { contact: normalizeEmail(trimmed), contactType: 'email' }
        : { contact: sanitizePhone(trimmed), contactType: 'phone', deliveryMethod }

      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to send code')
        return
      }

      const storedContact = isEmailLookup ? normalizeEmail(trimmed) : sanitizePhone(trimmed)
      const storedType = isEmailLookup ? 'email' : 'phone'

      sessionStorage.setItem('jorder_contact', storedContact)
      sessionStorage.setItem('jorder_phone', storedContact)
      sessionStorage.setItem('jorder_contact_type', storedType)
      sessionStorage.setItem('jorder_delivery_method', deliveryMethod)
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
        transition={{ duration: 0.28 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <Wordmark dark className="justify-center" />
          <p className="mt-4 text-sm text-slate-300">Choose how you want to continue</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.25)]">
          <div className="rounded-2xl border border-navy-200 bg-navy-50 p-1 mb-5">
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setLoginMethod('code')}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition-all ${loginMethod === 'code' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500'}`}
              >
                Verification code
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('password')}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition-all ${loginMethod === 'password' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500'}`}
              >
                Password
              </button>
            </div>
          </div>

          <form onSubmit={loginMethod === 'password' ? handlePasswordLogin : handleSendCode} className="space-y-5">
            <div className="rounded-2xl border border-navy-200 bg-navy-50 p-1">
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setContactType('email')}
                  className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                    contactType === 'email' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  <Mail size={16} />
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setContactType('phone')}
                  className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                    contactType === 'phone' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  <Phone size={16} />
                  Phone number
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                {isEmailLookup ? <Mail size={18} /> : <Phone size={18} />}
              </div>
              <input
                type={isEmailLookup ? 'email' : 'tel'}
                value={contact}
                onChange={(e) => setContactValue(e.target.value)}
                placeholder={isEmailLookup ? 'you@example.com' : '+250 7XX XXX XXX'}
                className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-11 pr-4 text-navy-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                aria-label={isEmailLookup ? 'Email address' : 'Phone number'}
                autoComplete={isEmailLookup ? 'email' : 'tel'}
                inputMode={isEmailLookup ? 'email' : 'tel'}
              />
            </div>

            {loginMethod === 'password' && (
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-navy-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  aria-label="Password"
                  autoComplete="current-password"
                />
              </div>
            )}

            {!isEmailLookup && loginMethod === 'code' && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.08em] text-slate-500">Delivery method</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('sms')}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                      deliveryMethod === 'sms' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <Smartphone size={16} />
                    SMS
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('whatsapp')}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                      deliveryMethod === 'whatsapp' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <MessageSquareText size={16} />
                    WhatsApp
                  </button>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              {loginMethod === 'password' ? 'Log in with password' : 'Send verification code'}
            </Button>
          </form>

          <div className="mt-4 border-t border-slate-200 pt-4 text-center">
            <button
              onClick={() => router.push('/order/new?guest=1')}
              className="w-full py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
            >
              Continue as guest
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-300">
          Gas Engineering and Services Ltd · Gasabo, Kigali
        </p>
      </motion.div>
    </div>
  )
}
