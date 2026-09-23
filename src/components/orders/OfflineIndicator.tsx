'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, Wifi, CloudUpload } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [justCameOnline, setJustCameOnline] = useState(false)

  const pendingOrders = useLiveQuery(
    () => db.offlineOrders.where('synced').equals(0).count(),
    []
  )

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      setJustCameOnline(true)
      setTimeout(() => setJustCameOnline(false), 3000)
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const show = !isOnline || (!!pendingOrders && pendingOrders > 0) || justCameOnline

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          className={`fixed top-16 inset-x-0 z-50 flex justify-center px-4 pt-2`}
        >
          <div
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg ${
              !isOnline
                ? 'bg-red-600 text-white'
                : justCameOnline
                  ? 'bg-green-600 text-white'
                  : 'bg-amber-500 text-white'
            }`}
          >
            {!isOnline ? (
              <>
                <WifiOff size={14} />
                <span>
                  No connection
                  {!!pendingOrders && pendingOrders > 0 && ` · ${pendingOrders} order${pendingOrders > 1 ? 's' : ''} queued`}
                </span>
              </>
            ) : justCameOnline ? (
              <>
                <Wifi size={14} />
                <span>Back online</span>
              </>
            ) : (
              <>
                <CloudUpload size={14} />
                <span>Syncing {pendingOrders} order{pendingOrders !== 1 ? 's' : ''}...</span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
