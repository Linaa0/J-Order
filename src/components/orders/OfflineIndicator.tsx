'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, Wifi, CloudUpload } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslations } from 'next-intl'
import { db } from '@/lib/db'

export function OfflineIndicator() {
  const t = useTranslations('offline')
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
      const timer = setTimeout(() => setJustCameOnline(false), 3000)
      return () => clearTimeout(timer)
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
          className="fixed top-16 inset-x-0 z-50 flex justify-center px-4 pt-2"
        >
          <div
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg ${
              !isOnline ? 'bg-red-600 text-white' : justCameOnline ? 'bg-green-600 text-white' : 'bg-navy-700 text-white'
            }`}
          >
            {!isOnline ? (
              <>
                <WifiOff size={14} />
                <span>
                  {t('noConnection')}
                  {!!pendingOrders && pendingOrders > 0 && ` · ${pendingOrders === 1 ? t('queued', { count: pendingOrders }) : t('queuedPlural', { count: pendingOrders })}`}
                </span>
              </>
            ) : justCameOnline ? (
              <>
                <Wifi size={14} />
                <span>{t('backOnline')}</span>
              </>
            ) : (
              <>
                <CloudUpload size={14} />
                <span>{pendingOrders === 1 ? t('syncing', { count: pendingOrders ?? 0 }) : t('syncingPlural', { count: pendingOrders ?? 0 })}</span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
