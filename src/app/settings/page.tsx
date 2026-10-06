'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { toast } from 'sonner'

export default function SettingsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [language, setLanguage] = useState('en')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }

    setLanguage(session.user.preferredLanguage || 'en')
  }, [session, status, router])

  async function handleSave() {
    if (!session) return
    setSaving(true)
    try {
      const payload: Record<string, string> = { preferredLanguage: language }
      if (newPassword.trim()) {
        payload.currentPassword = currentPassword
        payload.newPassword = newPassword
      }

      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Could not save settings')
      }

      document.cookie = `NEXT_LOCALE=${language}; path=/; max-age=31536000`
      localStorage.setItem('jorder_lang', language)
      toast.success('Settings saved')
      setCurrentPassword('')
      setNewPassword('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-navy-900">Settings</h1>
      </div>

      <Card className="space-y-5 p-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-navy-700">Language</label>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className="h-11 w-full rounded-xl border border-navy-200 bg-white px-3 text-sm outline-none focus:border-ember-500"
          >
            <option value="en">English</option>
            <option value="rw">Kinyarwanda</option>
            <option value="fr">Français</option>
            <option value="sw">Kiswahili</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-navy-700">Current password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder="Enter your current password"
            className="h-11 w-full rounded-xl border border-navy-200 bg-white px-3 text-sm outline-none focus:border-ember-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-navy-700">New password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="Enter a new password"
            className="h-11 w-full rounded-xl border border-navy-200 bg-white px-3 text-sm outline-none focus:border-ember-500"
          />
        </div>

        <Button loading={saving} onClick={() => void handleSave()} className="w-full">
          Save settings
        </Button>
      </Card>
    </div>
  )
}
