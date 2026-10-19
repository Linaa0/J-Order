'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { toast } from 'sonner'

export default function SettingsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const t = useTranslations('settings')
  const tAuth = useTranslations('auth')
  const tCommon = useTranslations('common')
  const [language, setLanguage] = useState('en')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }

    setLanguage(session.user.preferredLanguage || 'en')
  }, [session, status, router])

  const isPasswordValid = newPassword.length >= 8 && newPassword === confirmPassword && currentPassword.length > 0

  async function handleLanguageChange(code: string) {
    setLanguage(code)
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000`
    localStorage.setItem('jorder_lang', code)
    try {
      await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredLanguage: code }),
      })
      // Full page reload to pick up new locale from cookie
      window.location.reload()
    } catch (err) {
      toast.error(tCommon('retry'))
    }
  }

  async function handlePasswordSave() {
    if (!session) return
    if (!isPasswordValid) {
      setError(t('passwordError'))
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || tAuth('errorGeneric'))
      }

      toast.success(t('passwordChanged'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : tAuth('errorGeneric'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-[640px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-navy-900">{t('title')}</h1>
        <p className="text-sm text-gray-600 mt-1">{t('subtitle')}</p>
      </div>

      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-navy-900 mb-3">{t('language')}</h2>
          <select
            value={language}
            onChange={(e) => void handleLanguageChange(e.target.value)}
            className="h-11 w-full px-4 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
          >
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="rw">Kinyarwanda</option>
            <option value="sw">Kiswahili</option>
          </select>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-base font-semibold text-navy-900 mb-3">{tAuth('newPassword')}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{tAuth('currentPassword')}</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={tAuth('currentPasswordPlaceholder')}
                  className="h-11 w-full px-4 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                >
                  {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{tAuth('newPassword')}</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={tAuth('newPasswordPlaceholder')}
                  className="h-11 w-full px-4 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">{t('passwordHint')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('confirmPassword')}</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('confirmPasswordPlaceholder')}
                  className="h-11 w-full px-4 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-600 mt-1">{t('passwordMismatch')}</p>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex justify-end">
              <Button
                onClick={() => void handlePasswordSave()}
                disabled={!isPasswordValid || saving}
                loading={saving}
                className="bg-ember-600 hover:bg-ember-700 text-white focus:ring-2 focus:ring-ember-500 focus:ring-offset-2"
              >
                {t('save')}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
