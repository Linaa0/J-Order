'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useTranslations, useLocale } from 'next-intl'
import { Eye, EyeOff, Shield, Globe, User, Phone, Mail, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'

export default function SettingsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const currentLocale = useLocale()
  const t = useTranslations('settings')
  const tAuth = useTranslations('auth')
  const tCommon = useTranslations('common')
  const tNav = useTranslations('nav')

  const [language, setLanguage] = useState(currentLocale)
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
    if (session.user.preferredLanguage) {
      setLanguage(session.user.preferredLanguage)
    }
  }, [session, status, router])

  const isPasswordValid =
    newPassword.length >= 8 && newPassword === confirmPassword && currentPassword.length > 0

  const userInitials = useMemo(() => {
    const name = session?.user?.name?.trim() || ''
    if (!name) return 'U'
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return parts[0].slice(0, 2).toUpperCase()
  }, [session?.user?.name])

  const roleLabel = useMemo(() => {
    switch (session?.user?.role) {
      case 'ADMIN':
        return tNav('roleAdmin')
      case 'ORDER_STAFF':
        return tNav('roleOrderStaff')
      case 'TECHNICIAN':
        return tNav('roleTechnician')
      case 'CLIENT':
      default:
        return tNav('roleClient')
    }
  }, [session?.user?.role, tNav])

  const roleBadgeClass = useMemo(() => {
    switch (session?.user?.role) {
      case 'ADMIN':
        return 'bg-purple-50 text-purple-800 border-purple-200/60'
      case 'ORDER_STAFF':
        return 'bg-blue-50 text-blue-800 border-blue-200/60'
      case 'TECHNICIAN':
        return 'bg-teal-50 text-teal-800 border-teal-200/60'
      case 'CLIENT':
      default:
        return 'bg-navy-50 text-navy-800 border-navy-200/60'
    }
  }, [session?.user?.role])

  const languageOptions = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'fr', label: 'French', native: 'Français' },
    { code: 'rw', label: 'Kinyarwanda', native: 'Kinyarwanda' },
    { code: 'sw', label: 'Swahili', native: 'Kiswahili' },
  ]

  async function handleLanguageChange(code: string) {
    if (code === language) return
    setLanguage(code)
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000`
    localStorage.setItem('jorder_lang', code)
    try {
      await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredLanguage: code }),
      })
      window.location.reload()
    } catch {
      toast.error(tCommon('retry'))
    }
  }

  async function handlePasswordSave(e?: React.FormEvent) {
    if (e) e.preventDefault()
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

  // Smooth loading skeleton with zero layout jump
  if (status === 'loading') {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-7 w-32 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-gray-100 rounded-lg animate-pulse mt-2" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-xs h-48 animate-pulse" />
            <div className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-xs h-64 animate-pulse" />
          </div>
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-xs h-96 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Account Details & Language Preferences */}
        <div className="space-y-6">
          {/* Account Profile Card */}
          <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-navy-50 text-navy-900 flex items-center justify-center shrink-0">
                <User size={16} />
              </div>
              <h2 className="text-sm font-bold text-navy-900">{t('accountInfo')}</h2>
            </div>

            <div className="flex items-center gap-3.5 pb-4 border-b border-gray-100">
              <div className="h-12 w-12 rounded-full bg-navy-900 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-navy-900 text-sm leading-tight truncate">
                  {session?.user?.name || tNav('greeting', { name: 'User' })}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${roleBadgeClass}`}>
                    {roleLabel}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3.5 space-y-2 text-xs text-gray-600">
              {session?.user?.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={13} className="text-gray-400 shrink-0" />
                  <span className="font-mono">{session.user.phone}</span>
                </div>
              )}
              {session?.user?.email && (
                <div className="flex items-center gap-2">
                  <Mail size={13} className="text-gray-400 shrink-0" />
                  <span className="truncate">{session.user.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Language Preferences Card */}
          <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-navy-50 text-navy-900 flex items-center justify-center shrink-0">
                <Globe size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-navy-900">{t('language')}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{languageOptions.find((l) => l.code === language)?.native}</p>
              </div>
            </div>

            <div className="space-y-2">
              {languageOptions.map((opt) => {
                const isSelected = language === opt.code
                return (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => void handleLanguageChange(opt.code)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all text-xs ${
                      isSelected
                        ? 'border-navy-900 bg-navy-50/50 text-navy-900 font-semibold shadow-2xs'
                        : 'border-gray-200/80 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-navy-900">{opt.native}</p>
                      <p className="text-gray-400 font-normal">{opt.label}</p>
                    </div>
                    {isSelected && (
                      <span className="h-5 w-5 rounded-full bg-navy-900 text-white flex items-center justify-center shrink-0">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Security & Password */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-gray-100">
              <div className="h-9 w-9 rounded-lg bg-navy-50 text-navy-900 flex items-center justify-center shrink-0">
                <Shield size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-navy-900">{t('security')}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{tAuth('newPassword')}</p>
              </div>
            </div>

            <form onSubmit={handlePasswordSave} className="space-y-4 max-w-lg">
              <div>
                <label className="block text-xs font-semibold text-navy-900 mb-1.5">
                  {tAuth('currentPassword')}
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={tAuth('currentPasswordPlaceholder')}
                    className="h-10 w-full rounded-lg border border-gray-300 px-3 pr-10 text-sm text-navy-900 focus:outline-none focus:border-navy-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy-900"
                    aria-label={showCurrentPassword ? t('hidePassword') : t('showPassword')}
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-900 mb-1.5">
                  {tAuth('newPassword')}
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={tAuth('newPasswordPlaceholder')}
                    className="h-10 w-full rounded-lg border border-gray-300 px-3 pr-10 text-sm text-navy-900 focus:outline-none focus:border-navy-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy-900"
                    aria-label={showNewPassword ? t('hidePassword') : t('showPassword')}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">{t('passwordHint')}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-900 mb-1.5">
                  {t('confirmPassword')}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('confirmPasswordPlaceholder')}
                    className="h-10 w-full rounded-lg border border-gray-300 px-3 pr-10 text-sm text-navy-900 focus:outline-none focus:border-navy-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy-900"
                    aria-label={showConfirmPassword ? t('hidePassword') : t('showPassword')}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-600 mt-1">{t('passwordMismatch')}</p>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                  {error}
                </div>
              )}

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={!isPasswordValid || saving}
                  loading={saving}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-xs"
                >
                  {t('save')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
