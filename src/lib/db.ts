import Dexie, { type Table } from 'dexie'
import type { OfflineOrder } from '@/types'

export class JOrderDB extends Dexie {
  offlineOrders!: Table<OfflineOrder>

  constructor() {
    super('JOrderDB')
    this.version(1).stores({
      offlineOrders: 'localId, synced, createdAt',
    })
  }
}

export const db = new JOrderDB()
