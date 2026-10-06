import type { ProductCategory, TruckCapacity } from '@prisma/client'

export const PRODUCT_WEIGHT_KG: Record<ProductCategory, number> = {
  GAS_REFILL: 12,
  CYLINDER_6KG: 6,
  CYLINDER_12KG: 12,
  CYLINDER_20KG: 20,
  CYLINDER_38KG: 38,
}

export const TRUCK_CAPACITY_KG: Record<TruckCapacity, number> = {
  TWO_TONNES: 2000,
  THREE_AND_HALF_TONNES: 3500,
  FOUR_AND_HALF_TONNES: 4500,
}

export function calculateOrderWeight(items: Array<{ product: ProductCategory; quantity: number }>) {
  return items.reduce((total, item) => total + PRODUCT_WEIGHT_KG[item.product] * item.quantity, 0)
}

export function suggestTruckCapacity(weightKg: number): TruckCapacity | null {
  if (weightKg <= TRUCK_CAPACITY_KG.TWO_TONNES) return 'TWO_TONNES'
  if (weightKg <= TRUCK_CAPACITY_KG.THREE_AND_HALF_TONNES) return 'THREE_AND_HALF_TONNES'
  if (weightKg <= TRUCK_CAPACITY_KG.FOUR_AND_HALF_TONNES) return 'FOUR_AND_HALF_TONNES'
  return null
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const radians = (degrees: number) => degrees * Math.PI / 180
  const latitudeDelta = radians(b.lat - a.lat)
  const longitudeDelta = radians(b.lng - a.lng)
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(longitudeDelta / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}
