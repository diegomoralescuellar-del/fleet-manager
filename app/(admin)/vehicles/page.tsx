'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Vehicle } from '@/lib/supabase'

const TIPOS = ['auto', 'camion', 'moto', 'otro'] as const
const TIPO_ICONS: Record<string, string> = {
  auto: '🚗', camion: '🚛', moto: '🏍️', otro: '🚐',
}
const STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-500/20 text-green-400',
  in_use: 'bg-yellow-500/20 text-yellow-400',
  maintenance: 'bg-red-500/20 text-red-400',
}
const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  in_use: 'En uso',
  maintenance: 'Mantenimiento',
}

export default function VehiclesPage() {
  const router = useRouter()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ plate: '', type: 'auto' as typeof TIPOS[number] })
  const [error, setError] = useState('')

  async function loadAll() {
    const res = await fetch('/api/vehicles/all')
    const data = await res.json()
    setVehicles(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.plate.trim()) { setError('Ingresá la patente'); return }
    setSaving(true)
    const res = await fetch('/api/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: form.type, plate: form.plate.trim().toUpperCase() }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Error al guardar'); setSaving(false); return }
    setForm({ plate: '', type: 'auto' })
    setShowForm(false)
    setSaving(false)
    loadAll()
  }

  async function handleStatus(id: string, status: Vehicle['status']) {
    await fetch(`/api/vehicles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    loadAll()
  }

  async function handleDelete(id: string, plate: string) {
    if (!confirm(`¿Eliminar el vehículo ${plate}? Esta acción no se puede deshacer.`)) return
    await fetch(`/api/vehicles/${id}`, { method: 'DELETE' })
    loadAll()
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-white text-sm mb-1 transition-colors">
              ← Volver al Dashboard
            </button>
            <h1 className="text-2xl font-bold">Gestión de Vehículos</h1>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setError('') }}
            className="bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-xl font-semibold transition-colors"
          >
            {showForm ? '✕ Cancelar' : '+ Agregar Vehículo'}
          </button>
        </div>

        {/* Formulario */}
        {showForm && (
          <form onSubmit={handleAdd} className="bg-gray-900 rounded-2xl p-5 mb-6 flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1 flex-1 min-w-40">
              <label className="text-xs text-gray-400 uppercase tracking-wider">Patente</label>
              <input
                type="text"
                placeholder="Ej: GHI-012"
                value={form.plate}
                onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value }))}
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-lg font-bold uppercase focus:outline-none focus:border-blue-500"
                maxLength={10}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 uppercase tracking-wider">Tipo</label>
              <div className="flex gap-2">
                {TIPOS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, type: t }))}
                    className={`px-3 py-2 rounded-xl border-2 transition-colors capitalize ${
                      form.type === t
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-gray-700 hover:border-gray-500'
                    }`}
                  >
                    {TIPO_ICONS[t]} {t}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="bg-green-600 hover:bg-green-500 disabled:bg-gray-700 px-6 py-2.5 rounded-xl font-bold transition-colors"
            >
              {saving ? 'Guardando...' : '✓ Guardar'}
            </button>
            {error && <p className="w-full text-red-400 text-sm">{error}</p>}
          </form>
        )}

        {/* Lista */}
        <div className="bg-gray-900 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3">Vehículo</th>
                <th className="text-left px-5 py-3">Tipo</th>
                <th className="text-left px-5 py-3">Estado</th>
                <th className="text-right px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-10 text-gray-500">Cargando...</td></tr>
              ) : vehicles.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-10 text-gray-500">No hay vehículos</td></tr>
              ) : vehicles.map((v) => (
                <tr key={v.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-3 font-bold text-lg">{v.plate}</td>
                  <td className="px-5 py-3 capitalize">{TIPO_ICONS[v.type]} {v.type}</td>
                  <td className="px-5 py-3">
                    <select
                      value={v.status}
                      onChange={(e) => handleStatus(v.id, e.target.value as Vehicle['status'])}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border-0 cursor-pointer ${STATUS_COLORS[v.status]} bg-transparent`}
                    >
                      <option value="available">Disponible</option>
                      <option value="in_use">En uso</option>
                      <option value="maintenance">Mantenimiento</option>
                    </select>
                    <span className={`ml-1 px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[v.status]}`}>
                      {STATUS_LABELS[v.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleDelete(v.id, v.plate)}
                      className="text-red-400 hover:text-red-300 text-sm transition-colors"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
