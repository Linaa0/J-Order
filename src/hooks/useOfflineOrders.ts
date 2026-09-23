'use client'
import { useEffect, useCallback } from 'react'
import { db } from '@/lib/db'
import type { OfflineOrder } from '@/types'

function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function useOfflineSync() {
  const syncPendingOrders = useCallback(async () => {
    if (!navigator.onLine) return
    const pending = await db.offlineOrders.where('synced').equals(0).toArray()
    for (const order of pending) {
      if (order.syncAttempts >= 5) continue
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: order.items,
            deliveryAddress: order.deliveryAddress,
            deliveryLat: order.deliveryLat,
            deliveryLng: order.deliveryLng,
            preferredDate: order.preferredDate,
            preferredTime: order.preferredTime,
            notes: order.notes,
            guestPhone: order.guestPhone,
          }),
        })
        if (res.ok) {
          await db.offlineOrders.update(order.localId, { synced: true as unknown as number })
        } else {
          await db.offlineOrders.update(order.localId, {
            syncAttempts: order.syncAttempts + 1,
          })
        }
      } catch {
        await db.offlineOrders.update(order.localId, {
          syncAttempts: order.syncAttempts + 1,
        })
      }
    }
  }, [])

  useEffect(() => {
    window.addEventListener('online', syncPendingOrders)
    syncPendingOrders()
    return () => window.removeEventListener('online', syncPendingOrders)
  }, [syncPendingOrders])

  const saveOrderOffline = async (
    orderData: Omit<OfflineOrder, 'localId' | 'synced' | 'syncAttempts' | 'createdAt'>
  ) => {
    const offlineOrder: OfflineOrder = {
      ...orderData,
      localId: generateLocalId(),
      synced: false,
      syncAttempts: 0,
      createdAt: new Date().toISOString(),
    }
    await db.offlineOrders.add(offlineOrder)
    return offlineOrder
  }

  return { saveOrderOffline, syncPendingOrders }
}
