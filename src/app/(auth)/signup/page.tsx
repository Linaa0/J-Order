'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { User, Globe } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { GearLogo } from '@/components/branding/GearLogo'
import { resolveAuthContact } from '@/lib/contact'

export default function SignupPage() {
  const router = useRouter()
  const t = useTranslations('auth')
  const tApp = useTranslations('app')

  const [name, setName] = useState('')
  const [language, setLanguage] = useState('en')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const stored = typeof window !== 'undefined'
    ? resolveAuthContact(
        sessionStorage.getItem('jorder_contact'),
        sessionStorage.getItem('jorder_contact_type'),
        sessionStorage.getItem('jorder_phone')
      )
    : { contact: '', type: 'phone' as const }

  const contact = stored.contact
  const contactType = stored.type

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'rw', name: 'Kinyarwanda' },
    { code: 'sw', name: 'Kiswahili' },
  ]

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const trimmedName = name.trim()
    if (!trimmedName) { setError(t('nameRequired')); return }
    
    setLoading(true)
    try {
      // Update user profile with name and language
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, preferredLanguage: language }),
      })
      
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || t('errorGeneric'))
        return
      }

      // Clear session storage
      sessionStorage.removeItem('jorder_contact')
      sessionStorage.removeItem('jorder_phone')
      sessionStorage.removeItem('jorder_contact_type')
      sessionStorage.removeItem('jorder_delivery_method')
      sessionStorage.removeItem('jorder_new_user')
      sessionStorage.removeItem('jorder_otp')

      router.push('/')
    } catch {
      setError(t('errorGeneric'))
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'h-12 w-full rounded-xl border-2 border-navy-200 bg-white px-4 text-navy-900 placeholder-navy-300 focus:border-navy-800 focus:outline-none focus:ring-2 focus:ring-navy-800/20 transition-all'

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
          <h2 className="text-2xl font-bold text-navy-900 mb-2">{t('completeSignup')}</h2>
          <p className="text-sm text-navy-500 mb-6">{t('signupHint')}</p>

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Name input */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400 pointer-events-none">
                <User size={17} aria-hidden="true" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('namePlaceholder')}
                className={`${inputCls} pl-10`}
                aria-label={t('name')}
                autoComplete="name"
              />
            </div>

            {/* Language selector */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400 pointer-events-none">
                <Globe size={17} aria-hidden="true" />
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={`${inputCls} pl-10 appearance-none cursor-pointer`}
                aria-label={t('language')}
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-sm text-red-600" role="alert">{error}</p>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              {t('completeSignupCta')}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-navy-400">
          {tApp('company')} · {tApp('location')}
        </p>
      </motion.div>
    </div>
  )
}
