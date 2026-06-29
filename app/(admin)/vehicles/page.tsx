'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Vehicle } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

const TIPOS = ['auto', 'camion', 'moto', 'otro'] as const
const TIPO_ICONS: Record<string, string> = { auto: '🚗', camion: '🚛', moto: '🏍️', otro: '🚐' }
const STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-500/20 text-green-400',
  in_use: 'bg-yellow-500/20 text-yellow-400',
  maintenance: 'bg-red-500/20 text-red-400',
}
const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible', in_use: 'En uso', maintenance: 'Mantenimiento',
}

type VehicleExt = Vehicle & { password?: string; fuel_limit?: number | null; vtv_url?: string | null }
type EditState = { password: string; fuel_limit: string; vtv_url: string }

export default function VehiclesPage() {
  const router = useRouter()
  const [vehicles, setVehicles] = useState<VehicleExt[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ plate: '', type: 'auto' as typeof TIPOS[number] })
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ password: '', fuel_limit: '', vtv_url: '' })
  const [uploadingVtv, setUploadingVtv] = useState(false)
  const vtvRef = useRef<HTMLInputElement>(null)

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
    if (!confirm(`¿Eliminar el vehículo ${plate}?`)) return
    await fetch(`/api/vehicles/${id}`, { method: 'DELETE' })
    loadAll()
  }

  function startEdit(v: VehicleExt) {
    setEditingId(v.id)
    setEditState({
      password: v.password ?? '',
      fuel_limit: v.fuel_limit != null ? String(v.fuel_limit) : '',
      vtv_url: v.vtv_url ?? '',
    })
  }

  async function handleVtvUpload(vehicleId: string, file: File) {
    setUploadingVtv(true)
    const path = `vtv/${vehicleId}/${Date.now()}.pdf`
    const { error } = await supabase.storage.from('fleet-photos').upload(path, file, { upsert: true })
    if (error) { alert('Error subiendo PDF: ' + error.message); setUploadingVtv(false); return }
    const { data } = supabase.storage.from('fleet-photos').getPublicUrl(path)
    setEditState((s) => ({ ...s, vtv_url: data.publicUrl }))
    setUploadingVtv(false)
  }

  async function saveEdit(id: string) {
    await fetch(`/api/vehicles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: editState.password || null,
        fuel_limit: editState.fuel_limit ? Number(editState.fuel_limit) : null,
        vtv_url: editState.vtv_url || null,
      }),
    })
    setEditingId(null)
    loadAll()
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-5xl mx-auto">
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
                  <button key={t} type="button" onClick={() => setForm((f) => ({ ...f, type: t }))}
                    className={`px-3 py-2 rounded-xl border-2 transition-colors capitalize ${form.type === t ? 'border-blue-500 bg-blue-500/20' : 'border-gray-700 hover:border-gray-500'}`}>
                    {TIPO_ICONS[t]} {t}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={saving}
              className="bg-green-600 hover:bg-green-500 disabled:bg-gray-700 px-6 py-2.5 rounded-xl font-bold transition-colors">
              {saving ? 'Guardando...' : '✓ Guardar'}
            </button>
            {error && <p className="w-full text-red-400 text-sm">{error}</p>}
          </form>
        )}

        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="text-center py-10 text-gray-500">Cargando...</div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No hay vehículos</div>
          ) : vehicles.map((v) => (
            <div key={v.id} className="bg-gray-900 rounded-2xl p-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{TIPO_ICONS[v.type]}</span>
                  <div>
                    <p className="font-bold text-xl">{v.plate}</p>
                    <p className="text-gray-400 text-sm capitalize">{v.type}</p>
                  </div>
                  {v.vtv_url && (
                    <a href={v.vtv_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded-lg hover:bg-blue-600/40 transition-colors">
                      📄 VTV
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <select value={v.status} onChange={(e) => handleStatus(v.id, e.target.value as Vehicle['status'])}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border-0 cursor-pointer ${STATUS_COLORS[v.status]} bg-transparent`}>
                    <option value="available">Disponible</option>
                    <option value="in_use">En uso</option>
                    <option value="maintenance">Mantenimiento</option>
                  </select>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[v.status]}`}>{STATUS_LABELS[v.status]}</span>
                  <button onClick={() => editingId === v.id ? setEditingId(null) : startEdit(v)}
                    className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
                    {editingId === v.id ? 'Cerrar' : '⚙️ Config'}
                  </button>
                  <button onClick={() => handleDelete(v.id, v.plate)}
                    className="text-red-400 hover:text-red-300 text-sm transition-colors">
                    Eliminar
                  </button>
                </div>
              </div>

              {/* Info rápida */}
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                {v.password ? <span>🔒 Con contraseña</span> : <span>🔓 Sin contraseña</span>}
                {v.fuel_limit ? <span>⛽ Límite: {v.fuel_limit}L/mes</span> : <span>⛽ Sin límite</span>}
              </div>

              {/* Panel de edición */}
              {editingId === v.id && (
                <div className="mt-4 pt-4 border-t border-gray-800 flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-400 uppercase tracking-wider">🔒 Contraseña</label>
                      <input
                        type="text"
                        placeholder="Sin contraseña"
                        value={editState.password}
                        onChange={(e) => setEditState((s) => ({ ...s, password: e.target.value }))}
                        className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-400 uppercase tracking-wider">⛽ Límite combustible (L/mes)</label>
                      <input
                        type="number"
                        placeholder="Sin límite"
                        value={editState.fuel_limit}
                        onChange={(e) => setEditState((s) => ({ ...s, fuel_limit: e.target.value }))}
                        className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400 uppercase tracking-wider">📄 PDF de VTV</label>
                    <div className="flex gap-2 items-center">
                      <input ref={vtvRef} type="file" accept="application/pdf" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVtvUpload(v.id, f) }} />
                      <button type="button" onClick={() => vtvRef.current?.click()}
                        disabled={uploadingVtv}
                        className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                        {uploadingVtv ? 'Subiendo...' : '📤 Subir PDF'}
                      </button>
                      {editState.vtv_url && (
                        <a href={editState.vtv_url} target="_blank" rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-sm underline">
                          Ver actual
                        </a>
                      )}
                    </div>
                  </div>
                  <button onClick={() => saveEdit(v.id)}
                    className="self-start bg-green-600 hover:bg-green-500 px-6 py-2.5 rounded-xl font-bold transition-colors">
                    ✓ Guardar cambios
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
