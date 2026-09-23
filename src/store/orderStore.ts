import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface OrderFormData {
  product: string
  quantity: number
  deliveryAddress: string
  deliveryLat?: number
  deliveryLng?: number
  preferredDate: string
  preferredTime: string
  notes: string
}

interface OrderStore {
  formData: Partial<OrderFormData>
  currentStep: number
  setFormData: (data: Partial<OrderFormData>) => void
  setStep: (step: number) => void
  reset: () => void
}

const initialForm: Partial<OrderFormData> = {}

export const useOrderStore = create<OrderStore>()(
  persist(
    (set) => ({
      formData: initialForm,
      currentStep: 0,
      setFormData: (data) =>
        set((state) => ({ formData: { ...state.formData, ...data } })),
      setStep: (step) => set({ currentStep: step }),
      reset: () => set({ formData: initialForm, currentStep: 0 }),
    }),
    { name: 'j-order-form' }
  )
)
