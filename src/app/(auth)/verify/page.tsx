'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { GearLogo } from '@/components/branding/GearLogo'
import { resolveAuthContact } from '@/lib/contact'
import { toast } from 'sonner'

export default function VerifyPage() {
  const router = useRouter()
  const t = useTranslations('auth')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(30)
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const stored = typeof window !== 'undefined'
    ? resolveAuthContact(
        sessionStorage.getItem('jorder_contact'),
        sessionStorage.getItem('jorder_contact_type'),
        sessionStorage.getItem('jorder_phone')
      )
    : { contact: '', type: 'phone' as const }

  const contact = stored.contact
  const contactType = stored.type
  const isNewUser = typeof window !== 'undefined' ? sessionStorage.getItem('jorder_new_user') === 'true' : false

  useEffect(() => {
    if (!contact) {
      router.push('/login')
      return
    }
    inputs.current[0]?.focus()
    const timer = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [contact, router])

  function handleChange(idx: number, value: string) {
    if (loading) return
    if (!/^\d*$/.test(value)) return
    const next = [...code]
    next[idx] = value.slice(-1)
    setCode(next)
    if (value && idx < 5) inputs.current[idx + 1]?.focus()
    if (next.every((c) => c)) {
      verify(next.join(''))
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    e.preventDefault()
    const next = Array.from({ length: 6 }, (_, index) => pasted[index] ?? '')
    setCode(next)
    inputs.current[Math.min(pasted.length, 5)]?.focus()
    if (pasted.length === 6) verify(pasted)
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus()
    }
  }

  async function verify(otp: string) {
    setError('')
    setLoading(true)
    try {
      const result = await signIn('credentials', {
        contact,
        otp,
        redirect: false,
      })
      if (result?.error) {
        setError(t('otpInvalid'))
        setCode(['', '', '', '', '', ''])
        inputs.current[0]?.focus()
      } else {
        // Store OTP for signup flow if needed
        sessionStorage.setItem('jorder_otp', otp)
        
        if (isNewUser) {
          router.push('/signup')
        } else {
          toast.success(t('successSignIn'))
          router.push('/')
        }
      }
    } catch {
      setError(t('errorGeneric'))
    } finally {
      setLoading(false)
    }
  }

  async function resend() {
    if (countdown > 0) return
    setResending(true)
    setError('')
    try {
      const payload = contactType === 'email'
        ? { contact, contactType: 'email' }
        : { contact, contactType: 'phone', deliveryMethod: sessionStorage.getItem('jorder_delivery_method') ?? 'sms' }

      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || t('errorGeneric'))
        return
      }

      setCountdown(30)
      toast.success(t('codeSentVia', { channel: data.channel || t('viaSms') }))
    } catch {
      setError(t('errorGeneric'))
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm"
      >
        <button
          onClick={() => router.push('/login')}
          className="flex items-center gap-2 text-gray-500 hover:text-navy-900 mb-6 transition-colors min-h-[44px]"
        >
          <ArrowLeft size={16} />
          <span className="text-sm font-medium">{t('back')}</span>
        </button>

        <div className="text-center mb-6">
          <GearLogo className="mx-auto mb-3" iconClassName="h-10 w-14" wordmarkClassName="text-2xl" />
          <h1 className="font-body text-2xl font-bold text-navy-900 mb-1">{t('otpTitle')}</h1>
          <p className="text-gray-500 text-sm">
            {t('otpSubtitle')}{' '}
            <span className="text-navy-900 font-semibold">{contact}</span>
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 sm:p-8 border border-gray-200 shadow-sm">
          <div className="flex gap-2 justify-center mb-5">
            {code.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => { inputs.current[idx] = el }}
                type="tel"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                className="h-12 w-11 rounded-lg border border-gray-300 text-center text-lg font-bold text-navy-900 focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900 transition-colors"
                aria-label={`Digit ${idx + 1}`}
              />
            ))}
          </div>

          {error && (
            <p className="text-sm text-red-600 text-center mb-4" role="alert">{error}</p>
          )}

          <Button
            className="w-full"
            size="md"
            loading={loading}
            onClick={() => {
              const full = code.join('')
              if (full.length === 6) verify(full)
            }}
            disabled={code.join('').length < 6}
          >
            {t('verify')}
          </Button>

          <div className="mt-4 text-center">
            {countdown > 0 ? (
              <p className="text-sm text-gray-500">
                {t('resendIn', { seconds: countdown })}
              </p>
            ) : (
              <button
                onClick={resend}
                disabled={resending}
                className="text-sm text-orange-600 font-medium hover:text-orange-700 transition-colors disabled:opacity-50 min-h-[44px]"
              >
                {resending ? t('resending') : t('resend')}
              </button>
            )}
          </div>

          <div className="mt-2 text-center">
            <button
              onClick={() => router.push('/login')}
              className="text-sm text-gray-500 hover:text-navy-900 transition-colors min-h-[44px]"
            >
              {t('changeContact')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
