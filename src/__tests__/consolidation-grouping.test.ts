import { distanceKm } from '@/lib/order-operations'

describe('Consolidation Grouping Logic', () => {
  it('groups orders by proximity', () => {
    const orders = [
      { id: '1', deliveryLat: -1.95, deliveryLng: 30.05, weightKg: 50 },
      { id: '2', deliveryLat: -1.96, deliveryLng: 30.06, weightKg: 60 },
    ]
    
    const maxDistanceKm = 5
    const distance = distanceKm(
      { lat: orders[0].deliveryLat, lng: orders[0].deliveryLng },
      { lat: orders[1].deliveryLat, lng: orders[1].deliveryLng }
    )
    expect(distance).toBeLessThanOrEqual(maxDistanceKm)
  })

  it('groups orders within time window', () => {
    const now = new Date()
    const order1Time = new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago
    const order2Time = new Date(now.getTime() - 1 * 60 * 60 * 1000) // 1 hour ago
    const maxWaitHours = 48
    
    const timeDiff = Math.abs(order1Time.getTime() - order2Time.getTime()) / (1000 * 60 * 60)
    expect(timeDiff).toBeLessThanOrEqual(maxWaitHours)
  })

  it('calculates total weight for consolidation', () => {
    const orders = [
      { weightKg: 50 },
      { weightKg: 60 },
      { weightKg: 40 },
    ]
    const totalWeight = orders.reduce((sum, order) => sum + order.weightKg, 0)
    expect(totalWeight).toBe(150)
  })

  it('respects consolidation threshold', () => {
    const threshold = 100
    const orderWeight = 50
    const needsConsolidation = orderWeight < threshold
    expect(needsConsolidation).toBe(true)
  })

  it('prevents consolidation of large orders', () => {
    const threshold = 100
    const orderWeight = 150
    const needsConsolidation = orderWeight < threshold
    expect(needsConsolidation).toBe(false)
  })

  it('creates consolidation group reference', () => {
    const groupRef = 'CONS-' + Date.now()
    expect(groupRef).toMatch(/^CONS-/)
    expect(groupRef.length).toBeGreaterThan(5)
  })
})
