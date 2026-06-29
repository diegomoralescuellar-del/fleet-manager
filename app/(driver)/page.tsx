'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Vehicle } from '@/lib/supabase'
import { tripStartSchema, TripStartInput } from '@/lib/validations'
import { queueOperation } from '@/lib/offline-sync'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

const VEHICLE_ICONS: Record<string, string> = {
  auto: '🚗', camion: '🚛', moto: '🏍️', otro: '🚐',
}

type VehicleExt = Vehicle & { password?: string; fuel_limit?: number | null; vtv_url?: string | null }

export default function DriverHome() {
  const router = useRouter()
  const isOnline = useNetworkStatus()
  const [vehicles, setVehicles] = useState<VehicleExt[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [lastKm, setLastKm] = useState<number | null>(null)
  const [loadingKm, setLoadingKm] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [pendingValues, setPendingValues] = useState<TripStartInput | null>(null)
  const [usedLiters, setUsedLiters] = useState<number | null>(null)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<TripStartInput>({
    resolver: zodResolver(tripStartSchema) as Resolver<TripStartInput>,
    mode: 'onSubmit',
  })

  const selectedId = watch('vehicle_id')
  const selectedVehicle = vehicles.find((v) => v.id === selectedId)

  useEffect(() => {
    fetch('/api/vehicles')
      .then((r) => r.json())
      .then((data) => setVehicles(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setLoadingKm(true)
    setUsedLiters(null)
    fetch(`/api/vehicles/${selectedId}/last-km`)
      .then((r) => r.json())
      .then(({ km }) => {
        setLastKm(km)
        if (km !== null) setValue('km_start', km)
      })
      .finally(() => setLoadingKm(false))
    fetch(`/api/vehicles/${selectedId}/fuel-used`)
      .then((r) => r.json())
      .then(({ used }) => setUsedLiters(used ?? 0))
  }, [selectedId, setValue])

  async function onSubmit(values: TripStartInput) {
    const vehicle = vehicles.find((v) => v.id === values.vehicle_id)
    if (vehicle?.password) {
      setPendingValues(values)
      setShowPasswordModal(true)
      return
    }
    await startTrip(values)
  }

  async function handlePasswordConfirm() {
    const vehicle = vehicles.find((v) => v.id === pendingValues?.vehicle_id)
    if (passwordInput !== vehicle?.password) {
      setPasswordError('Contraseña incorrecta')
      return
    }
    setShowPasswordModal(false)
    setPasswordInput('')
    setPasswordError('')
    await startTrip(pendingValues!)
  }

  async function startTrip(values: TripStartInput) {
    setSubmitting(true)
    try {
      const tripId = crypto.randomUUID()
      const payload = {
        trip_id: tripId,
        vehicle_id: values.vehicle_id,
        km_start: values.km_start,
        started_at: new Date().toISOString(),
      }
      if (isOnline) {
        const res = await fetch('/api/trips/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      } else {
        await queueOperation('start-trip', { ...payload, id: tripId, status: 'open' })
      }
      const selectedVeh = vehicles.find((v) => v.id === values.vehicle_id)
      sessionStorage.setItem('active_trip_id', tripId)
      sessionStorage.setItem('active_vehicle_id', values.vehicle_id)
      sessionStorage.setItem('active_km_start', String(values.km_start))
      sessionStorage.setItem('active_plate', selectedVeh?.plate ?? '')
      router.push('/hub')
    } catch (e) {
      alert('Error al iniciar jornada. Intenta nuevamente.')
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  const fuelLimit = selectedVehicle?.fuel_limit ?? null
  const fuelUsedPct = fuelLimit && usedLiters !== null ? Math.min((usedLiters / fuelLimit) * 100, 100) : null
  const fuelRemaining = fuelLimit && usedLiters !== null ? Math.max(fuelLimit - usedLiters, 0) : null

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center pt-4">
        <h1 className="text-3xl font-bold tracking-tight">Fleet Manager</h1>
        <p className="text-gray-400 mt-1">Iniciar jornada</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label className="text-lg font-semibold text-gray-200">Seleccioná el vehículo</label>
          {loading ? (
            <div className="text-gray-500 text-center py-8">Cargando vehículos...</div>
          ) : vehicles.length === 0 ? (
            <div className="text-yellow-400 text-center py-8">No hay vehículos disponibles</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {vehicles.map((v) => (
                <label key={v.id} className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedId === v.id ? 'border-blue-500 bg-blue-500/20' : 'border-gray-700 bg-gray-900 hover:border-gray-500'
                }`}>
                  <input type="radio" value={v.id} {...register('vehicle_id')} className="sr-only" />
                  <span className="text-4xl">{VEHICLE_ICONS[v.type]}</span>
                  <span className="font-bold text-lg mt-1">{v.plate}</span>
                  <span className="text-gray-400 text-sm capitalize">{v.type}</span>
                  {v.vtv_url && (
                    <a
                      href={v.vtv_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
                    >
                      📄 VTV
                    </a>
                  )}
                </label>
              ))}
            </div>
          )}
          {errors.vehicle_id && <p className="text-red-400 text-sm">{errors.vehicle_id.message}</p>}
        </div>

        {/* Límite de combustible */}
        {fuelLimit !== null && usedLiters !== null && (
          <div className="bg-gray-900 rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">⛽ Combustible mensual</span>
              <span className={fuelRemaining === 0 ? 'text-red-400 font-bold' : 'text-white'}>
                {fuelRemaining?.toFixed(1)}L restantes / {fuelLimit}L
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  fuelUsedPct! >= 90 ? 'bg-red-500' : fuelUsedPct! >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${fuelUsedPct}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-lg font-semibold text-gray-200">Kilometraje inicial</label>
            {loadingKm && <span className="text-gray-500 text-sm">Buscando último km...</span>}
            {!loadingKm && lastKm !== null && <span className="text-green-400 text-sm">✓ Último km registrado</span>}
          </div>
          <input
            type="number"
            inputMode="numeric"
            placeholder="Ej: 125000"
            {...register('km_start')}
            className="w-full bg-gray-900 border-2 border-gray-700 rounded-2xl px-5 py-4 text-2xl font-bold text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {!loadingKm && lastKm !== null && (
            <p className="text-gray-500 text-sm">
              Último viaje en <span className="text-white font-semibold">{lastKm.toLocaleString()} km</span> — podés modificarlo si es necesario.
            </p>
          )}
          {errors.km_start && <p className="text-red-400 text-sm">{errors.km_start.message}</p>}
        </div>

        <button
          type="submit"
          disabled={submitting || loading}
          className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-2xl py-5 text-xl font-bold transition-colors mt-2"
        >
          {submitting ? 'Iniciando...' : '🚀 Iniciar Jornada'}
        </button>
      </form>

      {/* Modal contraseña */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4">
            <h2 className="text-xl font-bold text-center">🔒 Contraseña del vehículo</h2>
            <p className="text-gray-400 text-sm text-center">Ingresá la contraseña para <strong>{selectedVehicle?.plate}</strong></p>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setPasswordError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordConfirm()}
              placeholder="Contraseña"
              autoFocus
              className="bg-gray-800 border-2 border-gray-700 rounded-xl px-4 py-3 text-lg text-white focus:outline-none focus:border-blue-500"
            />
            {passwordError && <p className="text-red-400 text-sm text-center">{passwordError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowPasswordModal(false); setPasswordInput(''); setPasswordError('') }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-xl py-3 font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handlePasswordConfirm}
                className="flex-1 bg-blue-600 hover:bg-blue-500 rounded-xl py-3 font-bold transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
