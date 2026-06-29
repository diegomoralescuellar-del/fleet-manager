'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type ActiveTrip = {
  id: string
  vehicle_id: string
  km_start: number
  started_at: string
  vehicles: { plate: string; type: string }
}

export default function HubPage() {
  const router = useRouter()
  const [trip, setTrip] = useState<ActiveTrip | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/trips/active')
      .then((r) => r.json())
      .then((data) => {
        if (!data) { router.replace('/'); return }
        setTrip(data)
        // Actualizar sessionStorage con datos frescos de la DB
        sessionStorage.setItem('active_trip_id', data.id)
        sessionStorage.setItem('active_vehicle_id', data.vehicle_id)
        sessionStorage.setItem('active_km_start', String(data.km_start))
        sessionStorage.setItem('active_plate', data.vehicles?.plate ?? '')
      })
      .finally(() => setLoading(false))
  }, [router])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      Cargando...
    </div>
  )

  if (!trip) return null

  return (
    <div className="flex flex-col gap-6 pt-4">
      <div className="bg-gray-900 rounded-2xl p-4 text-center">
        <p className="text-gray-400 text-sm">Viaje en curso</p>
        <p className="text-3xl font-bold mt-1">{trip.vehicles?.plate}</p>
        <p className="text-gray-400 text-sm mt-1">
          Km inicial: <span className="text-white font-semibold">{trip.km_start.toLocaleString()}</span>
        </p>
      </div>

      <p className="text-center text-gray-400">¿Qué querés hacer?</p>

      <button
        onClick={() => router.push('/fuel')}
        className="w-full bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 rounded-2xl py-8 flex flex-col items-center gap-2 transition-colors"
      >
        <span className="text-5xl">⛽</span>
        <span className="text-xl font-bold text-gray-900">Cargar Combustible</span>
        <span className="text-gray-800 text-sm">Registrar litros y costo</span>
      </button>

      <button
        onClick={() => router.push('/end')}
        className="w-full bg-green-600 hover:bg-green-500 active:bg-green-700 rounded-2xl py-8 flex flex-col items-center gap-2 transition-colors"
      >
        <span className="text-5xl">🏁</span>
        <span className="text-xl font-bold">Finalizar Jornada</span>
        <span className="text-gray-300 text-sm">Registrar km final</span>
      </button>
    </div>
  )
}
