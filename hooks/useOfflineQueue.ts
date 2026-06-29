'use client'
import { useState, useEffect, useCallback } from 'react'
import { getPendingCount, syncPendingOperations } from '@/lib/offline-sync'
import { useNetworkStatus } from './useNetworkStatus'

export function useOfflineQueue() {
  const isOnline = useNetworkStatus()
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  const refreshCount = useCallback(async () => {
    const count = await getPendingCount()
    setPendingCount(count)
  }, [])

  useEffect(() => {
    refreshCount()
  }, [refreshCount])

  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      setIsSyncing(true)
      syncPendingOperations()
        .then(() => refreshCount())
        .finally(() => setIsSyncing(false))
    }
  }, [isOnline, pendingCount, refreshCount])

  return { isOnline, pendingCount, isSyncing, refreshCount }
}
