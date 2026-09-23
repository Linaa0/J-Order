'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, MapPin, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { getProductIcon } from '@/components/icons/ProductIcons'
import { useOrderStore } from '@/store/orderStore'
import { useOfflineSync } from '@/hooks/useOfflineOrders'
import { toast } from 'sonner'

const PRODUCTS = [
  { id: 'GAS_REFILL', label: 'Gas Refill', desc: 'Refill your existing LPG cylinder' },
  { id: 'CYLINDER_6KG', label: '6 Kg Cylinder', desc: 'New 6 kg gas cylinder' },
  { id: 'CYLINDER_12KG', label: '12 Kg Cylinder', desc: 'New 12 kg gas cylinder' },
  { id: 'CYLINDER_20KG', label: '20 Kg Cylinder', desc: 'New 20 kg gas cylinder' },
  { id: 'CYLINDER_38KG', label: '38 Kg Cylinder', desc: 'New 38 kg gas cylinder' },
]

const STEP_LABELS = ['Product', 'Quantity', 'Location', 'Date', 'Review']

export default function NewOrderPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isGuest = searchParams.get('guest') === '1'
  const { formData, currentStep, setFormData, setStep, reset } = useOrderStore()
  const { saveOrderOffline } = useOfflineSync()
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [gettingLocation, setGettingLocation] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const step = currentStep

  function validateStep(): boolean {
    const newErrors: Record<string, string> = {}
    if (step === 0 && !formData.product) newErrors.product = 'Please select a product'
    if (step === 1) {
      if (!formData.quantity || formData.quantity < 1) newErrors.quantity = 'Quantity must be at least 1'
    }
    if (step === 2) {
      if (!formData.deliveryAddress?.trim()) newErrors.deliveryAddress = 'Delivery location is required'
    }
    if (step === 3) {
      if (!formData.preferredDate) newErrors.preferredDate = 'Please select a date'
      if (!formData.preferredTime) newErrors.preferredTime = 'Please select a time'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function getLocation() {
    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData({ deliveryLat: pos.coords.latitude, deliveryLng: pos.coords.longitude })
        if (!formData.deliveryAddress) {
          setFormData({ deliveryAddress: `Location: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}` })
        }
        setGettingLocation(false)
        toast.success('Location captured')
      },
      () => {
        setGettingLocation(false)
        toast.error('Could not get location. Please enter address manually.')
      }
    )
  }

  async function handleSubmit() {
    setSubmitting(true)
    const payload = {
      items: [{ product: formData.product!, quantity: formData.quantity! }],
      deliveryAddress: formData.deliveryAddress!,
      deliveryLat: formData.deliveryLat,
      deliveryLng: formData.deliveryLng,
      preferredDate: formData.preferredDate!,
      preferredTime: formData.preferredTime!,
      notes: formData.notes,
      guestPhone: isGuest ? guestPhone : undefined,
    }

    if (!navigator.onLine) {
      const saved = await saveOrderOffline(payload)
      setSubmitting(false)
      toast.success('Order saved. Will send when you reconnect.')
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
        toast.error(data.error || 'Failed to place order')
        setSubmitting(false)
        return
      }
      setOrderNumber(data.data.orderNumber)
      setSubmitted(true)
      reset()
    } catch {
      toast.error('No connection. Saving order locally.')
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
            <CheckCircle2 size={80} className="mx-auto text-green-500 mb-4" />
          </motion.div>
          <h1 className="font-display text-2xl font-bold text-navy-900 mb-2">Order Placed</h1>
          <p className="text-navy-500 mb-2">Your order has been received. We will confirm shortly.</p>
          <p className="font-mono text-navy-700 text-sm font-semibold bg-navy-50 rounded-xl px-3 py-2 inline-block mb-6">
            {orderNumber}
          </p>
          <div className="space-y-3">
            <Button className="w-full" onClick={() => router.push('/orders')}>
              View My Orders
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.push('/order/new')}>
              Place Another Order
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => step === 0 ? router.push('/orders') : setStep(step - 1)}
          className="p-2 rounded-xl hover:bg-navy-50 text-navy-600 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-xl font-bold text-navy-900">{STEP_LABELS[step]}</h1>
          <p className="text-xs text-navy-400">Step {step + 1} of {STEP_LABELS.length}</p>
        </div>
      </div>

      <div className="flex gap-1">
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
          transition={{ duration: 0.2 }}
        >
          {step === 0 && (
            <div className="grid grid-cols-1 gap-3">
              {PRODUCTS.map((product) => (
                <motion.button
                  key={product.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setFormData({ product: product.id }); setErrors({}) }}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                    formData.product === product.id
                      ? 'border-ember-700 bg-ember-50'
                      : 'border-navy-200 bg-white hover:border-navy-300'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    formData.product === product.id ? 'text-ember-700' : 'text-navy-600'
                  }`}>
                    {getProductIcon(product.id, { size: 32 })}
                  </div>
                  <div>
                    <p className="font-semibold text-navy-900">{product.label}</p>
                    <p className="text-sm text-navy-400">{product.desc}</p>
                  </div>
                  {formData.product === product.id && (
                    <CheckCircle2 size={20} className="ml-auto text-ember-700 shrink-0" />
                  )}
                </motion.button>
              ))}
              {errors.product && <p className="text-sm text-red-600">{errors.product}</p>}
            </div>
          )}

          {step === 1 && (
            <Card>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-navy-800 mb-2">How many do you need?</label>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ quantity: Math.max(1, (formData.quantity ?? 1) - 1) })}
                      className="w-12 h-12 rounded-xl border-2 border-navy-200 flex items-center justify-center text-xl font-bold text-navy-700 hover:border-navy-400 transition-colors"
                    >
                      –
                    </button>
                    <input
                      type="number"
                      value={formData.quantity ?? 1}
                      onChange={(e) => setFormData({ quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="flex-1 h-12 text-center text-2xl font-bold border-2 border-navy-200 rounded-xl focus:outline-none focus:border-ember-700"
                      min="1"
                      max="100"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ quantity: Math.min(100, (formData.quantity ?? 1) + 1) })}
                      className="w-12 h-12 rounded-xl border-2 border-navy-200 flex items-center justify-center text-xl font-bold text-navy-700 hover:border-navy-400 transition-colors"
                    >
                      +
                    </button>
                  </div>
                  {errors.quantity && <p className="text-sm text-red-600 mt-1">{errors.quantity}</p>}
                </div>
              </div>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-navy-800 mb-1">
                    Delivery Location <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-navy-400 mb-2">Enter your full address or use the map pin</p>
                  <textarea
                    value={formData.deliveryAddress ?? ''}
                    onChange={(e) => setFormData({ deliveryAddress: e.target.value })}
                    placeholder="e.g. KG 15 Ave, Kacyiru, Kigali"
                    className={`w-full rounded-xl border-2 p-3 text-navy-900 text-sm focus:outline-none focus:border-ember-700 focus:ring-2 focus:ring-ember-700/20 transition-all resize-none ${
                      errors.deliveryAddress ? 'border-red-500' : 'border-navy-200'
                    }`}
                    rows={3}
                  />
                  {errors.deliveryAddress && (
                    <p className="text-sm text-red-600 mt-1">{errors.deliveryAddress}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={getLocation}
                  disabled={gettingLocation}
                  className="flex items-center gap-2 text-sm text-ember-700 font-medium hover:text-ember-800 transition-colors disabled:opacity-50"
                >
                  {gettingLocation ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                  {gettingLocation ? 'Getting location...' : 'Use My Current Location'}
                </button>
                {formData.deliveryLat && (
                  <p className="text-xs text-green-600">
                    GPS coordinates captured ({formData.deliveryLat.toFixed(4)}, {formData.deliveryLng?.toFixed(4)})
                  </p>
                )}
              </div>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <div className="space-y-4">
                <Input
                  label="Preferred Delivery Date"
                  type="date"
                  required
                  value={formData.preferredDate ?? ''}
                  onChange={(e) => setFormData({ preferredDate: e.target.value })}
                  error={errors.preferredDate}
                  min={new Date().toISOString().split('T')[0]}
                />
                <Input
                  label="Preferred Delivery Time"
                  type="time"
                  required
                  value={formData.preferredTime ?? ''}
                  onChange={(e) => setFormData({ preferredTime: e.target.value })}
                  error={errors.preferredTime}
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-navy-800">Additional Notes</label>
                  <textarea
                    value={formData.notes ?? ''}
                    onChange={(e) => setFormData({ notes: e.target.value })}
                    placeholder="Any special instructions..."
                    className="w-full rounded-xl border-2 border-navy-200 p-3 text-navy-900 text-sm focus:outline-none focus:border-ember-700 resize-none"
                    rows={3}
                  />
                </div>
              </div>
            </Card>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <Card>
                <h2 className="font-display font-semibold text-navy-800 mb-3">Review Your Order</h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-navy-50 rounded-xl">
                    <div className="text-navy-700">{getProductIcon(formData.product!, { size: 32 })}</div>
                    <div>
                      <p className="font-semibold text-navy-900">
                        {PRODUCTS.find(p => p.id === formData.product)?.label}
                      </p>
                      <p className="text-sm text-navy-500">Quantity: {formData.quantity}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-navy-700">
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="text-ember-700 shrink-0 mt-0.5" />
                      <span>{formData.deliveryAddress}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Date:</span>
                      <span>{formData.preferredDate} at {formData.preferredTime}</span>
                    </div>
                    {formData.notes && (
                      <div className="p-2 bg-navy-50 rounded-lg text-navy-500">{formData.notes}</div>
                    )}
                  </div>
                </div>
              </Card>

              {isGuest && (
                <Card>
                  <Input
                    label="Your Phone Number"
                    type="tel"
                    required
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="+250 7XX XXX XXX"
                    hint="Required to track your order"
                  />
                </Card>
              )}

              {!navigator.onLine && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                  <span>You are offline. Order will be saved and sent automatically when you reconnect.</span>
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                loading={submitting}
                onClick={handleSubmit}
                disabled={isGuest && !guestPhone.trim()}
              >
                Place Order
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {step < 4 && (
        <Button
          className="w-full"
          onClick={() => {
            if (validateStep()) setStep(step + 1)
          }}
        >
          Next
          <ArrowRight size={16} />
        </Button>
      )}
    </div>
  )
}
