'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type ActiveTrip = {
  id: string
  vehicle_id: string
  km_start: number
  started_at: string
  vehicles: { plate: string; type: string; vtv_url?: string | null; fuel_limit?: number | null; vtv_status?: string; responsable_nombre?: string; responsable_dni?: string; multas_url?: string | null; cedula_url?: string | null }
}

export default function HubPage() {
  const router = useRouter()
  const [trip, setTrip] = useState<ActiveTrip | null>(null)
  const [loading, setLoading] = useState(true)
  const [usedLiters, setUsedLiters] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/trips/active')
      .then((r) => r.json())
      .then((data) => {
        if (!data) { router.replace('/'); return }
        setTrip(data)
        sessionStorage.setItem('active_trip_id', data.id)
        sessionStorage.setItem('active_vehicle_id', data.vehicle_id)
        sessionStorage.setItem('active_km_start', String(data.km_start))
        sessionStorage.setItem('active_plate', data.vehicles?.plate ?? '')
        // Cargar litros usados este mes
        fetch(`/api/vehicles/${data.vehicle_id}/fuel-used`)
          .then((r) => r.json())
          .then(({ used }) => setUsedLiters(used ?? 0))
      })
      .finally(() => setLoading(false))
  }, [router])

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Cargando...</div>
  if (!trip) return null

  const fuelLimit = trip.vehicles?.fuel_limit ?? null
  const fuelRemaining = fuelLimit !== null && usedLiters !== null ? Math.max(fuelLimit - usedLiters, 0) : null
  const fuelUsedPct = fuelLimit && usedLiters !== null && fuelLimit > 0 ? Math.min((usedLiters / fuelLimit) * 100, 100) : null

  return (
    <div className="flex flex-col gap-6 pt-4">
      <div className="bg-gray-900 rounded-2xl p-4 text-center">
        <p className="text-gray-400 text-sm">Viaje en curso</p>
        <p className="text-3xl font-bold mt-1">{trip.vehicles?.plate}</p>
        <p className="text-gray-400 text-sm mt-1">
          Km inicial: <span className="text-white font-semibold">{trip.km_start.toLocaleString()}</span>
        </p>
        {(trip.vehicles?.responsable_nombre || trip.vehicles?.responsable_dni) && (
          <div className="mt-2 text-sm text-gray-300">
            {trip.vehicles.responsable_nombre && <p>👤 {trip.vehicles.responsable_nombre}</p>}
            {trip.vehicles.responsable_dni && <p>🪪 DNI: {trip.vehicles.responsable_dni}</p>}
          </div>
        )}
        {(trip.vehicles?.cedula_url || trip.vehicles?.multas_url) && (
          <div className="flex gap-3 justify-center mt-2 flex-wrap">
            {trip.vehicles.cedula_url && (
              <a href={trip.vehicles.cedula_url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 underline">📋 Cédula</a>
            )}
            {trip.vehicles.multas_url && (
              <a href={trip.vehicles.multas_url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-orange-400 hover:text-orange-300 underline">🚨 Multas</a>
            )}
          </div>
        )}
        {trip.vehicles?.vtv_url && (
          <div className="flex flex-col items-center gap-1 mt-2">
            <a href={trip.vehicles.vtv_url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 underline">
              📄 Ver VTV
            </a>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              trip.vehicles.vtv_status === 'vencida'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-green-500/20 text-green-400'
            }`}>
              {trip.vehicles.vtv_status === 'vencida' ? '🔴 VTV Vencida' : '🟢 VTV Habilitada'}
            </span>
          </div>
        )}
      </div>

      {/* Límite de combustible */}
      {fuelLimit !== null && usedLiters !== null && (
        <div className="bg-gray-900 rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">⛽ Combustible mensual</span>
            <span className={fuelRemaining === 0 ? 'text-red-400 font-bold' : 'text-white'}>
              ${fuelRemaining?.toLocaleString('es-AR')} restantes / ${fuelLimit?.toLocaleString('es-AR')}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div className={`h-3 rounded-full transition-all ${
              fuelUsedPct! >= 90 ? 'bg-red-500' : fuelUsedPct! >= 70 ? 'bg-yellow-500' : 'bg-green-500'
            }`} style={{ width: `${fuelUsedPct}%` }} />
          </div>
        </div>
      )}

      <p className="text-center text-gray-400">¿Qué querés hacer?</p>

      <button onClick={() => router.push('/fuel')}
        className="w-full bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 rounded-2xl py-8 flex flex-col items-center gap-2 transition-colors">
        <span className="text-5xl">⛽</span>
        <span className="text-xl font-bold text-gray-900">Cargar Combustible</span>
        <span className="text-gray-800 text-sm">Registrar litros y costo</span>
      </button>

      <button onClick={() => router.push('/end')}
        className="w-full bg-green-600 hover:bg-green-500 active:bg-green-700 rounded-2xl py-8 flex flex-col items-center gap-2 transition-colors">
        <span className="text-5xl">🏁</span>
        <span className="text-xl font-bold">Finalizar Jornada</span>
        <span className="text-gray-300 text-sm">Registrar km final</span>
      </button>
    </div>
  )
}
