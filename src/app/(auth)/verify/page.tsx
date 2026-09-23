'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FlameIcon } from '@/components/icons/ProductIcons'
import { toast } from 'sonner'

export default function VerifyPage() {
  const router = useRouter()
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(60)
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const phone = typeof window !== 'undefined' ? sessionStorage.getItem('jorder_phone') ?? '' : ''

  useEffect(() => {
    if (!phone) {
      router.push('/login')
      return
    }
    inputs.current[0]?.focus()
    const timer = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  function handleChange(idx: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const next = [...code]
    next[idx] = value.slice(-1)
    setCode(next)
    if (value && idx < 5) inputs.current[idx + 1]?.focus()
    if (next.every((c) => c)) {
      verify(next.join(''))
    }
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
        phone,
        otp,
        redirect: false,
      })
      if (result?.error) {
        setError('Invalid or expired code. Please try again.')
        setCode(['', '', '', '', '', ''])
        inputs.current[0]?.focus()
      } else {
        toast.success('Signed in successfully')
        router.push('/')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function resend() {
    if (countdown > 0) return
    setResending(true)
    setError('')
    try {
      await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      setCountdown(60)
      toast.success('New code sent')
    } catch {
      setError('Failed to resend. Please try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-gradient flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <button
          onClick={() => router.push('/login')}
          className="flex items-center gap-2 text-navy-300 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>

        <div className="text-center mb-8">
          <FlameIcon size={48} className="mx-auto mb-4" />
          <h1 className="font-display text-3xl font-bold text-white mb-2">Enter Verification Code</h1>
          <p className="text-navy-300 text-sm">
            We sent a 6 digit code to{' '}
            <span className="text-white font-medium">{phone}</span>
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-navy">
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
                className="h-14 w-11 rounded-xl border-2 text-center text-xl font-bold text-navy-900 focus:outline-none focus:border-ember-700 focus:ring-2 focus:ring-ember-700/20 transition-all border-navy-200"
                aria-label={`Digit ${idx + 1}`}
              />
            ))}
          </div>

          {error && (
            <p className="text-sm text-red-600 text-center mb-4" role="alert">{error}</p>
          )}

          <Button
            className="w-full"
            size="lg"
            loading={loading}
            onClick={() => {
              const full = code.join('')
              if (full.length === 6) verify(full)
            }}
            disabled={code.join('').length < 6}
          >
            Verify
          </Button>

          <div className="mt-4 text-center">
            {countdown > 0 ? (
              <p className="text-sm text-navy-400">
                Resend code in <span className="text-navy-700 font-medium">{countdown}s</span>
              </p>
            ) : (
              <button
                onClick={resend}
                disabled={resending}
                className="text-sm text-ember-700 font-medium hover:text-ember-800 transition-colors disabled:opacity-50"
              >
                {resending ? 'Sending...' : 'Resend Code'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
