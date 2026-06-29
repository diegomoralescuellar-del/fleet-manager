'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase'
import { fuelSchema, FuelInput } from '@/lib/validations'
import { queueOperation } from '@/lib/offline-sync'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

export default function FuelPage() {
  const router = useRouter()
  const isOnline = useNetworkStatus()
  const [submitting, setSubmitting] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FuelInput>({ resolver: zodResolver(fuelSchema) as Resolver<FuelInput> })

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function uploadPhoto(file: File, tripId: string): Promise<string | null> {
    const ext = file.name.split('.').pop()
    const path = `fuel-tickets/${tripId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('fuel-photos').upload(path, file)
    if (error) {
      console.error('Upload error:', error)
      return null
    }
    const { data } = supabase.storage.from('fuel-photos').getPublicUrl(path)
    return data.publicUrl
  }

  async function onSubmit(values: FuelInput) {
    const res = await fetch('/api/trips/active')
    const trip = await res.json()
    const tripId = trip?.id
    if (!tripId) { router.push('/'); return }

    setSubmitting(true)
    try {
      let photoUrl: string | null = null
      if (photoFile && isOnline) {
        photoUrl = await uploadPhoto(photoFile, tripId)
      }

      const payload = {
        trip_id: tripId,
        liters: values.liters,
        total_cost: values.total_cost,
        photo_url: photoUrl,
        logged_at: new Date().toISOString(),
      }

      if (isOnline) {
        const res = await fetch('/api/fuel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error)
        }
      } else {
        await queueOperation('add-fuel', payload)
      }

      alert('✅ Carga registrada correctamente')
      router.push('/hub')
    } catch (e) {
      alert('Error al registrar la carga. Intenta nuevamente.')
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center pt-2">
        <div className="text-5xl mb-2">⛽</div>
        <h1 className="text-2xl font-bold">Cargar Combustible</h1>
        <p className="text-gray-400 text-sm mt-1">Registrá la carga de esta parada</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label className="text-lg font-semibold text-gray-200">Litros cargados</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="Ej: 45.5"
            {...register('liters')}
            className="w-full bg-gray-900 border-2 border-gray-700 rounded-2xl px-5 py-4 text-2xl font-bold text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition-colors"
          />
          {errors.liters && <p className="text-red-400 text-sm">{errors.liters.message}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-lg font-semibold text-gray-200">Costo total ($)</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="Ej: 8500"
            {...register('total_cost')}
            className="w-full bg-gray-900 border-2 border-gray-700 rounded-2xl px-5 py-4 text-2xl font-bold text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition-colors"
          />
          {errors.total_cost && <p className="text-red-400 text-sm">{errors.total_cost.message}</p>}
        </div>

        {/* Foto del ticket */}
        <div className="flex flex-col gap-2">
          <label className="text-lg font-semibold text-gray-200">
            Foto del ticket <span className="text-gray-500 text-sm font-normal">(opcional)</span>
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            className="hidden"
          />
          {photoPreview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt="Vista previa del ticket"
                className="w-full rounded-2xl object-cover max-h-48"
              />
              <button
                type="button"
                onClick={() => { setPhotoPreview(null); setPhotoFile(null) }}
                className="absolute top-2 right-2 bg-red-600 rounded-full w-8 h-8 flex items-center justify-center text-lg"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-600 rounded-2xl py-8 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors flex flex-col items-center gap-2"
            >
              <span className="text-3xl">📷</span>
              <span>Tomar foto o elegir imagen</span>
            </button>
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
            disabled={submitting}
            className="flex-1 bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-2xl py-4 text-lg font-bold text-gray-900 transition-colors"
          >
            {submitting ? 'Guardando...' : '✅ Registrar'}
          </button>
        </div>
      </form>
    </div>
  )
}
