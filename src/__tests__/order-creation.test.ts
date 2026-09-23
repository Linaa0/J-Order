import { generateOrderNumber } from '@/lib/utils'
import { canTransitionTo, getStatusStep, ORDER_STATUS_STEPS } from '@/lib/order-utils'
import { OrderStatus } from '@prisma/client'

describe('Order Creation', () => {
  it('generates unique order numbers', () => {
    const n1 = generateOrderNumber()
    const n2 = generateOrderNumber()
    expect(n1).toMatch(/^GES/)
    expect(n1).not.toBe(n2)
  })

  it('order numbers start with GES', () => {
    const num = generateOrderNumber()
    expect(num.startsWith('GES')).toBe(true)
  })
})

describe('Status Transitions', () => {
  it('allows valid forward transitions', () => {
    expect(canTransitionTo(OrderStatus.PENDING, OrderStatus.CONFIRMED)).toBe(true)
    expect(canTransitionTo(OrderStatus.CONFIRMED, OrderStatus.PROCESSING)).toBe(true)
    expect(canTransitionTo(OrderStatus.PROCESSING, OrderStatus.OUT_FOR_DELIVERY)).toBe(true)
    expect(canTransitionTo(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED)).toBe(true)
  })

  it('blocks invalid backward transitions', () => {
    expect(canTransitionTo(OrderStatus.CONFIRMED, OrderStatus.PENDING)).toBe(false)
    expect(canTransitionTo(OrderStatus.DELIVERED, OrderStatus.PROCESSING)).toBe(false)
    expect(canTransitionTo(OrderStatus.COMPLETED, OrderStatus.PENDING)).toBe(false)
  })

  it('allows cancellation from pending and confirmed', () => {
    expect(canTransitionTo(OrderStatus.PENDING, OrderStatus.CANCELLED)).toBe(true)
    expect(canTransitionTo(OrderStatus.CONFIRMED, OrderStatus.CANCELLED)).toBe(true)
  })

  it('blocks transitions from terminal states', () => {
    expect(canTransitionTo(OrderStatus.CANCELLED, OrderStatus.PENDING)).toBe(false)
    expect(canTransitionTo(OrderStatus.CANCELLED, OrderStatus.CONFIRMED)).toBe(false)
    expect(canTransitionTo(OrderStatus.COMPLETED, OrderStatus.CONFIRMED)).toBe(false)
  })

  it('returns correct step index', () => {
    expect(getStatusStep(OrderStatus.PENDING)).toBe(0)
    expect(getStatusStep(OrderStatus.CONFIRMED)).toBe(1)
    expect(getStatusStep(OrderStatus.DELIVERED)).toBe(4)
  })
})

describe('Offline Sync', () => {
  it('has correct status step ordering', () => {
    const expected = [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
      OrderStatus.PROCESSING,
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.DELIVERED,
    ]
    expect(ORDER_STATUS_STEPS).toEqual(expected)
  })

  it('generateOrderNumber produces non-empty strings', () => {
    for (let i = 0; i < 10; i++) {
      const num = generateOrderNumber()
      expect(num.length).toBeGreaterThan(0)
    }
  })
})
