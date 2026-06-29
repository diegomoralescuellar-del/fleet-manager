'use client'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const { isOnline, pendingCount, isSyncing } = useOfflineQueue()

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Status bar */}
      <div className={`w-full py-2 px-4 text-center text-sm font-semibold ${
        isOnline ? 'bg-green-700' : 'bg-red-700'
      }`}>
        {isSyncing
          ? '⟳ Sincronizando datos...'
          : isOnline
          ? pendingCount > 0
            ? `✓ Online — ${pendingCount} registro(s) sincronizado(s)`
            : '✓ Online'
          : `✗ Sin conexión — ${pendingCount} registro(s) pendiente(s)`}
      </div>
      <main className="max-w-md mx-auto px-4 py-6">{children}</main>
      <div className="text-center pb-4">
        <a href="/dashboard" className="text-xs text-gray-500 hover:text-gray-300 underline">
          Panel admin →
        </a>
      </div>
    </div>
  )
}
