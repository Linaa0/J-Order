import { calculateOrderWeight, suggestTruckCapacity, TRUCK_CAPACITY_KG } from '@/lib/order-operations'
import { ProductCategory } from '@prisma/client'

describe('Capacity Calculation and Over-Capacity Blocking', () => {
  it('calculates order weight correctly', () => {
    const items = [
      { product: ProductCategory.CYLINDER_6KG, quantity: 2 },
      { product: ProductCategory.CYLINDER_12KG, quantity: 1 },
    ]
    const weight = calculateOrderWeight(items)
    expect(weight).toBe(24) // 2 * 6 + 1 * 12
  })

  it('suggests appropriate truck capacity based on weight', () => {
    const weight = 1500
    const suggested = suggestTruckCapacity(weight)
    expect(suggested).toBe('TWO_TONNES')
  })

  it('suggests larger truck for heavier loads', () => {
    const weight = 3000
    const suggested = suggestTruckCapacity(weight)
    expect(suggested).toBe('THREE_AND_HALF_TONNES')
  })

  it('blocks orders exceeding truck capacity', () => {
    const items = [
      { product: ProductCategory.CYLINDER_38KG, quantity: 200 },
    ]
    const weight = calculateOrderWeight(items)
    const suggested = suggestTruckCapacity(weight)
    expect(suggested).toBeNull() // Exceeds all capacities (200 * 38 = 7600 kg > 4500)
  })

  it('validates truck capacity limits', () => {
    expect(TRUCK_CAPACITY_KG.TWO_TONNES).toBe(2000)
    expect(TRUCK_CAPACITY_KG.THREE_AND_HALF_TONNES).toBe(3500)
    expect(TRUCK_CAPACITY_KG.FOUR_AND_HALF_TONNES).toBe(4500)
  })

  it('handles empty order items', () => {
    const items: Array<{ product: ProductCategory; quantity: number }> = []
    const weight = calculateOrderWeight(items)
    expect(weight).toBe(0)
  })

  it('calculates weight for gas refills', () => {
    const items = [
      { product: ProductCategory.GAS_REFILL, quantity: 5 },
    ]
    const weight = calculateOrderWeight(items)
    expect(weight).toBeGreaterThan(0)
  })
})
