'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { tripEndSchema, TripEndInput } from '@/lib/validations'
import { queueOperation } from '@/lib/offline-sync'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

export default function EndTripPage() {
  const router = useRouter()
  const isOnline = useNetworkStatus()
  const [submitting, setSubmitting] = useState(false)
  const [tripId, setTripId] = useState<string | null>(null)
  const [vehicleId, setVehicleId] = useState<string | null>(null)
  const [kmStart, setKmStart] = useState<number>(0)
  const [plate, setPlate] = useState('')
  const [loading, setLoading] = useState(true)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<TripEndInput>({ resolver: zodResolver(tripEndSchema) as Resolver<TripEndInput>, mode: 'onSubmit' })

  // Obtener trip activo desde DB (fuente de verdad)
  useEffect(() => {
    fetch('/api/trips/active')
      .then((r) => r.json())
      .then((data) => {
        if (!data) { router.replace('/'); return }
        setTripId(data.id)
        setVehicleId(data.vehicle_id)
        setKmStart(data.km_start)
        setPlate(data.vehicles?.plate ?? '')
      })
      .finally(() => setLoading(false))
  }, [router])

  async function onSubmit(values: TripEndInput) {
    if (!tripId) return

    if (values.km_end <= kmStart) {
      setError('km_end', {
        message: `Debe ser mayor al km inicial (${kmStart.toLocaleString()})`,
      })
      return
    }

    setSubmitting(true)
    try {
      const now = new Date().toISOString()

      if (isOnline) {
        const res = await fetch('/api/trips/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trip_id: tripId, vehicle_id: vehicleId, km_end: values.km_end, ended_at: now }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error)
        }
      } else {
        await queueOperation('end-trip', { id: tripId, km_end: values.km_end, ended_at: now, status: 'closed' })
      }

      sessionStorage.clear()
      router.push('/')
    } catch (e) {
      alert('Error al finalizar jornada. Intenta nuevamente.')
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500">Cargando...</div>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center pt-2">
        <div className="text-5xl mb-2">🏁</div>
        <h1 className="text-2xl font-bold">Finalizar Jornada</h1>
        {plate && <p className="text-blue-400 font-semibold mt-1">{plate}</p>}
        {kmStart > 0 && (
          <p className="text-gray-400 text-sm mt-1">
            Km inicial: <span className="text-white font-bold">{kmStart.toLocaleString()}</span>
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label className="text-lg font-semibold text-gray-200">Kilometraje final</label>
          <input
            type="number"
            inputMode="numeric"
            placeholder={kmStart ? `Mayor a ${kmStart.toLocaleString()}` : 'Ej: 125350'}
            {...register('km_end')}
            className="w-full bg-gray-900 border-2 border-gray-700 rounded-2xl px-5 py-4 text-2xl font-bold text-white placeholder-gray-600 focus:outline-none focus:border-green-500 transition-colors"
          />
          {errors.km_end && (
            <p className="text-red-400 text-sm font-semibold">{errors.km_end.message}</p>
          )}
        </div>

        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={() => router.push('/hub')}
            className="flex-1 bg-gray-800 hover:bg-gray-700 rounded-2xl py-4 text-lg font-semibold transition-colors"
          >
            ← Volver
          </button>
          <button
            type="submit"
            disabled={submitting || loading}
            className="flex-1 bg-green-600 hover:bg-green-500 active:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-2xl py-4 text-lg font-bold transition-colors"
          >
            {submitting ? 'Cerrando...' : '✓ Finalizar'}
          </button>
        </div>
      </form>
    </div>
  )
}
