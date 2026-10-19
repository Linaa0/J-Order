'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Mail, MessageSquareText, Phone, Smartphone, Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { GearLogo } from '@/components/branding/GearLogo'
import { detectContactType, normalizeEmail } from '@/lib/contact'
import { sanitizePhone } from '@/lib/utils'

type DeliveryMethod = 'sms' | 'whatsapp'
type ViewMode = 'otp' | 'password'

export default function LoginPage() {
  const router = useRouter()
  const t = useTranslations('auth')
  const tApp = useTranslations('app')

  const [contact, setContact] = useState('')
  const [contactType, setContactType] = useState<'email' | 'phone'>('phone')
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('sms')
  const [viewMode, setViewMode] = useState<ViewMode>('otp')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEmailLookup = useMemo(() => contactType === 'email' || contact.includes('@'), [contact, contactType])

  function setContactValue(value: string) {
    setContact(value)
    const next = detectContactType(value)
    if (next !== 'phone' || value.includes('@')) setContactType(next)
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const trimmed = contact.trim()
    if (!trimmed || !password.trim()) { setError(t('errorRequired')); return }
    setLoading(true)
    try {
      const result = await signIn('credentials', { contact: trimmed, password: password.trim(), redirect: false })
      if (result?.error) { setError(t('errorInvalid')); return }
      router.push('/')
    } catch {
      setError(t('errorGeneric'))
    } finally {
      setLoading(false)
    }
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const trimmed = contact.trim()
    if (!trimmed) { setError(t('errorRequired')); return }

    if (isEmailLookup) {
      const email = normalizeEmail(trimmed)
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError(t('errorEmail')); return }
    } else {
      const phone = sanitizePhone(trimmed)
      if (!phone || phone.length < 10) { setError(t('errorPhone')); return }
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
      if (!res.ok) { setError(data.error ?? t('errorGeneric')); return }

      const storedContact = isEmailLookup ? normalizeEmail(trimmed) : sanitizePhone(trimmed)
      sessionStorage.setItem('jorder_contact', storedContact)
      sessionStorage.setItem('jorder_phone', storedContact)
      sessionStorage.setItem('jorder_contact_type', isEmailLookup ? 'email' : 'phone')
      sessionStorage.setItem('jorder_delivery_method', deliveryMethod)
      sessionStorage.setItem('jorder_new_user', data.isNewUser ? 'true' : 'false')
      router.push('/verify')
    } catch {
      setError(t('errorGeneric'))
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'h-12 w-full rounded-xl border-2 border-navy-200 bg-white px-4 text-navy-900 placeholder-navy-300 focus:border-navy-800 focus:outline-none focus:ring-2 focus:ring-navy-800/20 transition-all'
  const methodActive = 'border-navy-800 bg-navy-50 text-navy-900'
  const methodInactive = 'border-navy-200 bg-white text-navy-500 hover:border-navy-400'

  return (
    <div className="min-h-screen bg-navy-gradient flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <GearLogo dark layout="stacked" iconClassName="h-14 w-[4.5rem]" wordmarkClassName="text-3xl" className="mx-auto" />
          <p className="mt-4 text-sm text-navy-300">{t('subtitle')}</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-navy">
          <h2 className="text-2xl font-bold text-navy-900 mb-2">{t('signInOrCreate')}</h2>
          <p className="text-sm text-navy-500 mb-6">{t('autoSignupHint')}</p>

          <form onSubmit={viewMode === 'password' ? handlePasswordLogin : handleSendCode} className="space-y-4">
            {/* Contact input - auto-detects email vs phone */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400 pointer-events-none">
                {isEmailLookup ? <Mail size={17} aria-hidden="true" /> : <Phone size={17} aria-hidden="true" />}
              </div>
              <input
                type={isEmailLookup ? 'email' : 'tel'}
                value={contact}
                onChange={(e) => setContactValue(e.target.value)}
                placeholder={t('contactPlaceholder')}
                className={`${inputCls} pl-10`}
                aria-label={t('contactLabel')}
                autoComplete={isEmailLookup ? 'email' : 'tel'}
                inputMode={isEmailLookup ? 'email' : 'tel'}
              />
            </div>

            {/* Password field - only shown in password mode */}
            {viewMode === 'password' && (
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400 pointer-events-none">
                  <Lock size={17} aria-hidden="true" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('passwordPlaceholder')}
                  className={`${inputCls} pl-10`}
                  aria-label={t('password')}
                  autoComplete="current-password"
                />
              </div>
            )}

            {/* SMS vs WhatsApp selector - only for phone in OTP mode */}
            {!isEmailLookup && viewMode === 'otp' && (
              <div className="rounded-2xl border border-navy-200 bg-navy-50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-500">{t('deliveryMethod')}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('sms')}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all min-h-[44px] ${deliveryMethod === 'sms' ? methodActive : methodInactive}`}
                  >
                    <Smartphone size={15} aria-hidden="true" />
                    {t('viaSms')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('whatsapp')}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all min-h-[44px] ${deliveryMethod === 'whatsapp' ? methodActive : methodInactive}`}
                  >
                    <MessageSquareText size={15} aria-hidden="true" />
                    {t('viaWhatsapp')}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600" role="alert">{error}</p>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              {viewMode === 'password' ? t('signInCta') : t('continue')}
            </Button>
          </form>

          {/* Password login link - secondary option */}
          {viewMode === 'otp' && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setViewMode('password')}
                className="text-sm text-navy-500 hover:text-navy-700 transition-colors min-h-[44px]"
              >
                {t('usePasswordInstead')}
              </button>
            </div>
          )}

          {/* Back to OTP link - when in password mode */}
          {viewMode === 'password' && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setViewMode('otp')}
                className="text-sm text-navy-500 hover:text-navy-700 transition-colors min-h-[44px]"
              >
                {t('useCodeInstead')}
              </button>
            </div>
          )}

          <div className="mt-4 border-t border-navy-100 pt-4 text-center">
            <button
              type="button"
              onClick={() => router.push('/order/new?guest=1')}
              className="w-full py-2 text-sm font-medium text-navy-400 transition-colors hover:text-navy-700 min-h-[44px]"
            >
              {t('orderWithoutAccount')}
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-navy-400">
          {tApp('company')} · {tApp('location')}
        </p>
      </motion.div>
    </div>
  )
}
