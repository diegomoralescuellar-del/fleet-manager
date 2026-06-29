'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Vehicle } from '@/lib/supabase'
import { queueOperation } from '@/lib/offline-sync'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

const VEHICLE_ICONS: Record<string, string> = {
  auto: '🚗', camion: '🚛', moto: '🏍️', otro: '🚐',
}

type VehicleExt = Vehicle & { password?: string; fuel_limit?: number | null; vtv_url?: string | null }
type Step = 'select' | 'password' | 'km'

export default function DriverHome() {
  const router = useRouter()
  const isOnline = useNetworkStatus()
  const [vehicles, setVehicles] = useState<VehicleExt[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<Step>('select')
  const [selected, setSelected] = useState<VehicleExt | null>(null)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [km, setKm] = useState('')
  const [kmError, setKmError] = useState('')
  const [lastKm, setLastKm] = useState<number | null>(null)
  const [loadingKm, setLoadingKm] = useState(false)

  useEffect(() => {
    fetch('/api/vehicles')
      .then((r) => r.json())
      .then((data) => setVehicles(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  function selectVehicle(v: VehicleExt) {
    setSelected(v)
    if (v.password) {
      setStep('password')
    } else {
      goToKmStep(v)
    }
  }

  function goToKmStep(v: VehicleExt) {
    setStep('km')
    setLoadingKm(true)
    fetch(`/api/vehicles/${v.id}/last-km`)
      .then((r) => r.json())
      .then(({ km: lastKmValue }) => {
        setLastKm(lastKmValue)
        if (lastKmValue !== null) setKm(String(lastKmValue))
      })
      .finally(() => setLoadingKm(false))
  }

  function handlePasswordConfirm() {
    if (!selected) return
    if (passwordInput !== selected.password) {
      setPasswordError('Contraseña incorrecta')
      return
    }
    setPasswordError('')
    setPasswordInput('')
    goToKmStep(selected)
  }

  function backToSelect() {
    setStep('select')
    setSelected(null)
    setPasswordInput('')
    setPasswordError('')
    setKm('')
    setKmError('')
    setLastKm(null)
  }

  async function startTrip() {
    if (!selected) return
    const kmValue = Number(km)
    if (!km || isNaN(kmValue) || kmValue <= 0) {
      setKmError('Ingresá un kilometraje válido')
      return
    }
    setKmError('')
    setSubmitting(true)
    try {
      const tripId = crypto.randomUUID()
      const payload = {
        trip_id: tripId,
        vehicle_id: selected.id,
        km_start: kmValue,
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
      sessionStorage.setItem('active_trip_id', tripId)
      sessionStorage.setItem('active_vehicle_id', selected.id)
      sessionStorage.setItem('active_km_start', String(kmValue))
      sessionStorage.setItem('active_plate', selected.plate)
      router.push('/hub')
    } catch (e) {
      alert('Error al iniciar jornada. Intenta nuevamente.')
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center pt-4">
        <h1 className="text-3xl font-bold tracking-tight">Driver Miavasa</h1>
        <p className="text-gray-400 mt-1">Iniciar jornada</p>
      </div>

      {step === 'select' && (
        <div className="flex flex-col gap-2">
          <label className="text-lg font-semibold text-gray-200">Seleccioná el vehículo</label>
          {loading ? (
            <div className="text-gray-500 text-center py-8">Cargando vehículos...</div>
          ) : vehicles.length === 0 ? (
            <div className="text-yellow-400 text-center py-8">No hay vehículos disponibles</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {vehicles.map((v) => (
                <button
                  key={v.id}
                  onClick={() => selectVehicle(v)}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-gray-700 bg-gray-900 hover:border-blue-500 transition-all"
                >
                  <span className="text-4xl">{VEHICLE_ICONS[v.type]}</span>
                  <span className="font-bold text-lg mt-1">{v.plate}</span>
                  <span className="text-gray-400 text-sm capitalize">{v.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 'password' && selected && (
        <div className="flex flex-col gap-4">
          <button onClick={backToSelect} className="text-gray-400 hover:text-white text-sm self-start transition-colors">
            ← Elegir otro vehículo
          </button>
          <div className="bg-gray-900 rounded-2xl p-6 flex flex-col gap-4">
            <h2 className="text-xl font-bold text-center">🔒 Contraseña del vehículo</h2>
            <p className="text-gray-400 text-sm text-center">Ingresá la contraseña para <strong>{selected.plate}</strong></p>
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
            <button
              onClick={handlePasswordConfirm}
              className="bg-blue-600 hover:bg-blue-500 rounded-xl py-3 font-bold transition-colors"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}

      {step === 'km' && selected && (
        <div className="flex flex-col gap-5">
          <button onClick={backToSelect} className="text-gray-400 hover:text-white text-sm self-start transition-colors">
            ← Elegir otro vehículo
          </button>
          <div className="bg-gray-900 rounded-2xl p-4 text-center">
            <span className="text-4xl">{VEHICLE_ICONS[selected.type]}</span>
            <p className="font-bold text-xl mt-1">{selected.plate}</p>
          </div>
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
              value={km}
              onChange={(e) => setKm(e.target.value)}
              className="w-full bg-gray-900 border-2 border-gray-700 rounded-2xl px-5 py-4 text-2xl font-bold text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {!loadingKm && lastKm !== null && (
              <p className="text-gray-500 text-sm">
                Último viaje en <span className="text-white font-semibold">{lastKm.toLocaleString()} km</span> — podés modificarlo si es necesario.
              </p>
            )}
            {kmError && <p className="text-red-400 text-sm">{kmError}</p>}
          </div>
          <button
            onClick={startTrip}
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-2xl py-5 text-xl font-bold transition-colors mt-2"
          >
            {submitting ? 'Iniciando...' : '🚀 Iniciar Jornada'}
          </button>
        </div>
      )}
    </div>
  )
}
