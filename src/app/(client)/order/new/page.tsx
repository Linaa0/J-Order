'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, MapPin, CheckCircle2, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { getProductIcon } from '@/components/icons/ProductIcons'
import { useOrderStore } from '@/store/orderStore'
import { useOfflineSync } from '@/hooks/useOfflineOrders'
import { validateRwandaTin } from '@/lib/order-utils'
import { toast } from 'sonner'

const PRODUCT_IDS = [
  'GAS_REFILL',
  'CYLINDER_6KG',
  'CYLINDER_12KG',
  'CYLINDER_20KG',
  'CYLINDER_38KG',
] as const

export default function NewOrderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isGuest = searchParams.get('guest') === '1'
  const { formData, currentStep, setFormData, setStep, reset } = useOrderStore()
  const { saveOrderOffline } = useOfflineSync()
  const t = useTranslations('order')
  const tp = useTranslations('products')
  const tCommon = useTranslations('common')

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [tin, setTin] = useState('')
  const [tinError, setTinError] = useState('')
  const [gettingLocation, setGettingLocation] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const step = currentStep

  const STEP_LABELS = [
    t('step1'), t('step2'), t('step3'), t('step4'), t('step5'),
  ]

  function validateStep(): boolean {
    const errs: Record<string, string> = {}
    if (step === 0 && !formData.product) errs.product = t('locationRequired')
    if (step === 1 && (!formData.quantity || formData.quantity < 1)) errs.quantity = t('quantity')
    if (step === 2 && !formData.deliveryAddress?.trim()) errs.deliveryAddress = t('locationRequired')
    if (step === 3) {
      if (!formData.preferredDate) errs.preferredDate = t('date')
      if (!formData.preferredTime) errs.preferredTime = t('time')
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function getLocation() {
    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData({ deliveryLat: pos.coords.latitude, deliveryLng: pos.coords.longitude })
        if (!formData.deliveryAddress) {
          setFormData({ deliveryAddress: `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}` })
        }
        setGettingLocation(false)
        toast.success(t('locationCaptured'))
      },
      () => {
        setGettingLocation(false)
        toast.error(t('locationHint'))
      },
    )
  }

  async function handleSubmit() {
    if (tin && !validateRwandaTin(tin)) {
      setTinError(t('tinInvalid'))
      return
    }
    setSubmitting(true)
    const payload = {
      items: [{ product: formData.product!, quantity: formData.quantity! }],
      deliveryAddress: formData.deliveryAddress!,
      deliveryLat: formData.deliveryLat,
      deliveryLng: formData.deliveryLng,
      preferredDate: formData.preferredDate!,
      preferredTime: formData.preferredTime!,
      notes: formData.notes,
      tinNumber: tin || undefined,
      guestPhone: isGuest ? guestPhone : undefined,
    }

    if (!navigator.onLine) {
      await saveOrderOffline(payload)
      setSubmitting(false)
      toast.success(t('queued'))
      reset()
      router.push('/orders')
      return
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? t('failedToPlace'))
        setSubmitting(false)
        return
      }
      setOrderNumber(data.data.orderNumber)
      setSubmitted(true)
      reset()
    } catch {
      toast.error(t('queued'))
      await saveOrderOffline(payload)
      reset()
      router.push('/orders')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center px-6 max-w-sm"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <CheckCircle2 size={80} className="mx-auto text-navy-800 mb-4" aria-hidden="true" />
          </motion.div>
          <h1 className="font-display text-2xl font-bold text-navy-900 mb-2">{t('success')}</h1>
          <p className="text-navy-500 mb-2">{t('successMessage')}</p>
          <p className="font-mono text-navy-700 text-sm font-semibold bg-navy-50 rounded-xl px-3 py-2 inline-block mb-6">
            {orderNumber}
          </p>
          <div className="space-y-3">
            <Button className="w-full" onClick={() => router.push('/orders')}>
              {t('viewOrders')}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.push('/order/new')}>
              {t('placeAnother')}
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => (step === 0 ? router.push('/orders') : setStep(step - 1))}
          className="p-2 rounded-xl hover:bg-navy-50 text-navy-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={t('back')}
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-xl font-bold text-navy-900">{STEP_LABELS[step]}</h1>
          <p className="text-xs text-navy-400">{step + 1} / {STEP_LABELS.length}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1" role="progressbar" aria-valuenow={step + 1} aria-valuemax={STEP_LABELS.length}>
        {STEP_LABELS.map((_, idx) => (
          <div
            key={idx}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${idx <= step ? 'bg-ember-gradient' : 'bg-navy-100'}`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.18 }}
        >
          {/* Step 0: Product */}
          {step === 0 && (
            <div className="grid grid-cols-1 gap-3">
              {PRODUCT_IDS.map((pid) => (
                <motion.button
                  key={pid}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setFormData({ product: pid }); setErrors({}) }}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all min-h-[72px] ${
                    formData.product === pid
                      ? 'border-navy-800 bg-navy-50'
                      : 'border-navy-200 bg-white hover:border-navy-400'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    formData.product === pid ? 'text-navy-800' : 'text-navy-500'
                  }`}>
                    {getProductIcon(pid, { size: 32 })}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-navy-900">{tp(pid)}</p>
                    <p className="text-sm text-navy-400">{tp(`${pid}_DESC` as Parameters<typeof tp>[0])}</p>
                  </div>
                  {formData.product === pid && (
                    <CheckCircle2 size={20} className="ml-auto text-navy-800 shrink-0" aria-hidden="true" />
                  )}
                </motion.button>
              ))}
              {errors.product && (
                <p className="text-sm text-red-600" role="alert">{errors.product}</p>
              )}
            </div>
          )}

          {/* Step 1: Quantity */}
          {step === 1 && (
            <Card>
              <div className="space-y-4">
                <label className="block text-sm font-medium text-navy-800">{t('howMany')}</label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    aria-label="Decrease"
                    onClick={() => setFormData({ quantity: Math.max(1, (formData.quantity ?? 1) - 1) })}
                    className="w-12 h-12 rounded-xl border-2 border-navy-200 flex items-center justify-center text-xl font-bold text-navy-700 hover:border-navy-400 transition-colors"
                  >
                    –
                  </button>
                  <input
                    type="number"
                    value={formData.quantity ?? 1}
                    onChange={(e) => setFormData({ quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="flex-1 h-12 text-center text-2xl font-bold border-2 border-navy-200 rounded-xl focus:outline-none focus:border-navy-800"
                    min="1"
                    max="100"
                    aria-label={t('quantity')}
                  />
                  <button
                    type="button"
                    aria-label="Increase"
                    onClick={() => setFormData({ quantity: Math.min(100, (formData.quantity ?? 1) + 1) })}
                    className="w-12 h-12 rounded-xl border-2 border-navy-200 flex items-center justify-center text-xl font-bold text-navy-700 hover:border-navy-400 transition-colors"
                  >
                    +
                  </button>
                </div>
                {errors.quantity && <p className="text-sm text-red-600" role="alert">{errors.quantity}</p>}
              </div>
            </Card>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <Card>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-navy-800 mb-1">
                    {t('location')} <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <p className="text-xs text-navy-400 mb-2">{t('locationHint')}</p>
                  <textarea
                    value={formData.deliveryAddress ?? ''}
                    onChange={(e) => setFormData({ deliveryAddress: e.target.value })}
                    placeholder="e.g. KG 15 Ave, Kacyiru, Kigali"
                    className={`w-full rounded-xl border-2 p-3 text-navy-900 text-sm focus:outline-none focus:border-navy-800 focus:ring-2 focus:ring-navy-800/20 transition-all resize-none ${
                      errors.deliveryAddress ? 'border-red-500' : 'border-navy-200'
                    }`}
                    rows={3}
                    aria-required="true"
                    aria-invalid={!!errors.deliveryAddress}
                  />
                  {errors.deliveryAddress && (
                    <p className="text-sm text-red-600 mt-1" role="alert">{errors.deliveryAddress}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={getLocation}
                  disabled={gettingLocation}
                  className="flex items-center gap-2 text-sm text-navy-700 font-medium hover:text-navy-900 transition-colors disabled:opacity-50"
                >
                  {gettingLocation
                    ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                    : <MapPin size={16} aria-hidden="true" />
                  }
                  {gettingLocation ? t('gettingLocation') : t('useMapPin')}
                </button>
                {formData.deliveryLat && (
                  <p className="text-xs text-navy-600">{t('locationCaptured')} ({formData.deliveryLat.toFixed(4)}, {formData.deliveryLng?.toFixed(4)})</p>
                )}
              </div>
            </Card>
          )}

          {/* Step 3: Date and time */}
          {step === 3 && (
            <Card>
              <div className="space-y-4">
                <Input
                  label={t('date')}
                  type="date"
                  required
                  value={formData.preferredDate ?? ''}
                  onChange={(e) => setFormData({ preferredDate: e.target.value })}
                  error={errors.preferredDate}
                  min={new Date().toISOString().split('T')[0]}
                />
                <Input
                  label={t('time')}
                  type="time"
                  required
                  value={formData.preferredTime ?? ''}
                  onChange={(e) => setFormData({ preferredTime: e.target.value })}
                  error={errors.preferredTime}
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-navy-800">{t('notes')}</label>
                  <textarea
                    value={formData.notes ?? ''}
                    onChange={(e) => setFormData({ notes: e.target.value })}
                    placeholder={t('notesPlaceholder')}
                    className="w-full rounded-xl border-2 border-navy-200 p-3 text-navy-900 text-sm focus:outline-none focus:border-navy-800 resize-none"
                    rows={3}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-4">
              <Card>
                <h2 className="font-display font-semibold text-navy-800 mb-3">{t('step5')}</h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-navy-50 rounded-xl">
                    <div className="text-navy-700 shrink-0">
                      {getProductIcon(formData.product!, { size: 32 })}
                    </div>
                    <div>
                      <p className="font-semibold text-navy-900">
                        {formData.product ? tp(formData.product as Parameters<typeof tp>[0]) : ''}
                      </p>
                      <p className="text-sm text-navy-500">{t('quantity')}: {formData.quantity}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-navy-700">
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="text-navy-700 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{formData.deliveryAddress}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{t('date')}:</span>
                      <span>{formData.preferredDate} · {formData.preferredTime}</span>
                    </div>
                    {formData.notes && (
                      <div className="p-2 bg-navy-50 rounded-lg text-navy-500">{formData.notes}</div>
                    )}
                  </div>
                </div>
              </Card>

              {/* TIN (optional) */}
              <Card>
                <Input
                  label={t('tin')}
                  type="text"
                  inputMode="numeric"
                  value={tin}
                  onChange={(e) => { setTin(e.target.value); setTinError('') }}
                  placeholder={t('tinPlaceholder')}
                  hint={t('tinHint')}
                  error={tinError}
                  maxLength={9}
                />
              </Card>

              {isGuest && (
                <Card>
                  <Input
                    label={t('guestPhone')}
                    type="tel"
                    required
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="+250 7XX XXX XXX"
                    hint={t('guestPhoneHint')}
                  />
                </Card>
              )}

              {typeof window !== 'undefined' && !navigator.onLine && (
                <div className="flex items-start gap-2 p-3 bg-navy-50 border border-navy-200 rounded-xl text-sm text-navy-700">
                  <span>{t('offlineWarning')}</span>
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                loading={submitting}
                onClick={handleSubmit}
                disabled={isGuest && !guestPhone.trim()}
              >
                {t('confirm')}
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {step < 4 && (
        <Button
          className="w-full"
          onClick={() => { if (validateStep()) setStep(step + 1) }}
        >
          {tCommon('confirm')}
          <ArrowRight size={16} aria-hidden="true" />
        </Button>
      )}
    </div>
  )
}
