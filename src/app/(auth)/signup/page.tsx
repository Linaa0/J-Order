'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { User, Globe } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { GearLogo } from '@/components/branding/GearLogo'

export default function SignupPage() {
  const router = useRouter()
  const t = useTranslations('auth')
  const tApp = useTranslations('app')

  const [name, setName] = useState('')
  const [language, setLanguage] = useState('en')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  const inputCls = 'h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-navy-900 placeholder-gray-400 focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900 transition-colors'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md"
      >
        <div className="mb-6 text-center">
          <GearLogo layout="stacked" iconClassName="h-12 w-16" wordmarkClassName="text-3xl" className="mx-auto" />
          <p className="mt-2 text-sm text-gray-500">{t('subtitle')}</p>
        </div>

        <div className="rounded-xl bg-white p-6 sm:p-8 border border-gray-200 shadow-sm">
          <h2 className="text-xl font-bold text-navy-900 mb-1">{t('completeSignup')}</h2>
          <p className="text-sm text-gray-500 mb-6">{t('signupHint')}</p>

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Name input */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <User size={16} aria-hidden="true" />
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
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <Globe size={16} aria-hidden="true" />
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

            <Button type="submit" loading={loading} className="w-full" size="md">
              {t('completeSignupCta')}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-gray-400">
          {tApp('company')} · {tApp('location')}
        </p>
      </motion.div>
    </div>
  )
}
