'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface UseLivePollingOptions {
  intervalMs?: number
  enabled?: boolean
  maxBackoffMs?: number
}

interface UseLivePollingResult {
  lastUpdated: Date | null
  secondsAgo: number
  refresh: () => Promise<void>
  isRefreshing: boolean
  error: Error | null
}

export function useLivePolling(
  fetcher: () => Promise<void>,
  options: UseLivePollingOptions = {}
): UseLivePollingResult {
  const {
    intervalMs = 10000,
    enabled = true,
    maxBackoffMs = 60000,
  } = options

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const inFlightRef = useRef(false)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const currentDelayRef = useRef(intervalMs)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)

  const executeFetch = useCallback(async () => {
    if (inFlightRef.current || !isMountedRef.current) return
    inFlightRef.current = true
    setIsRefreshing(true)

    try {
      await fetcherRef.current()
      if (isMountedRef.current) {
        setLastUpdated(new Date())
        setSecondsAgo(0)
        setError(null)
        currentDelayRef.current = intervalMs // reset backoff on success
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)))
        // Exponential backoff
        currentDelayRef.current = Math.min(currentDelayRef.current * 1.5, maxBackoffMs)
      }
    } finally {
      inFlightRef.current = false
      if (isMountedRef.current) {
        setIsRefreshing(false)
      }
    }
  }, [intervalMs, maxBackoffMs])

  // Schedule the next poll tick
  const scheduleNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!enabled) return

    timerRef.current = setTimeout(async () => {
      // Don't poll if document is hidden
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return
      }
      await executeFetch()
      scheduleNext()
    }, currentDelayRef.current)
  }, [enabled, executeFetch])

  // Initial and reactive polling loop
  useEffect(() => {
    isMountedRef.current = true
    scheduleNext()

    return () => {
      isMountedRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [scheduleNext])

  // Handle visibility change and window focus
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && enabled) {
        executeFetch().then(() => scheduleNext())
      }
    }

    const handleOnline = () => {
      if (enabled) {
        executeFetch().then(() => scheduleNext())
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityOrFocus)
    window.addEventListener('focus', handleVisibilityOrFocus)
    window.addEventListener('online', handleOnline)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
      window.removeEventListener('focus', handleVisibilityOrFocus)
      window.removeEventListener('online', handleOnline)
    }
  }, [enabled, executeFetch, scheduleNext])

  // 1-second ticker to update `secondsAgo`
  useEffect(() => {
    if (!lastUpdated) return

    const ticker = setInterval(() => {
      const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 1000)
      setSecondsAgo(Math.max(0, diff))
    }, 1000)

    return () => clearInterval(ticker)
  }, [lastUpdated])

  const manualRefresh = useCallback(async () => {
    await executeFetch()
    scheduleNext()
  }, [executeFetch, scheduleNext])

  return {
    lastUpdated,
    secondsAgo,
    refresh: manualRefresh,
    isRefreshing,
    error,
  }
}
