'use client'
import { useEffect, useState, useCallback } from 'react'
import { TripWithDetails } from '@/lib/supabase'
import * as XLSX from 'xlsx'

type Filters = {
  plate: string
  dateFrom: string
  dateTo: string
}

export default function AdminDashboard() {
  const [trips, setTrips] = useState<TripWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Filters>({ plate: '', dateFrom: '', dateTo: '' })

  const fetchTrips = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.plate) params.set('plate', filters.plate)
    if (filters.dateFrom) params.set('from', filters.dateFrom)
    if (filters.dateTo) params.set('to', filters.dateTo)

    const res = await fetch(`/api/trips?${params.toString()}`)
    const data = await res.json()
    setTrips(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [filters])

  useEffect(() => { fetchTrips() }, [fetchTrips])

  function exportXLSX() {
    const rows = trips.flatMap((t) => {
      const totalFuelCost = t.fuel_logs.reduce((s, f) => s + f.total_cost, 0)
      const totalLiters = t.fuel_logs.reduce((s, f) => s + f.liters, 0)
      const kmTraveled = t.km_end ? t.km_end - t.km_start : null

      if (t.fuel_logs.length === 0) {
        return [{
          'Patente': t.vehicles?.plate ?? '',
          'Tipo': t.vehicles?.type ?? '',
          'Inicio': new Date(t.started_at).toLocaleString('es-AR'),
          'Fin': t.ended_at ? new Date(t.ended_at).toLocaleString('es-AR') : 'En curso',
          'Km Inicial': t.km_start,
          'Km Final': t.km_end ?? '',
          'Km Recorridos': kmTraveled ?? '',
          'Litros': 0,
          'Costo Combustible ($)': 0,
          'Offline': t.synced_offline ? 'Sí' : 'No',
          '--- TOTALES ---': '',
        }]
      }

      return t.fuel_logs.map((f, i) => ({
        'Patente': i === 0 ? (t.vehicles?.plate ?? '') : '',
        'Tipo': i === 0 ? (t.vehicles?.type ?? '') : '',
        'Inicio': i === 0 ? new Date(t.started_at).toLocaleString('es-AR') : '',
        'Fin': i === 0 ? (t.ended_at ? new Date(t.ended_at).toLocaleString('es-AR') : 'En curso') : '',
        'Km Inicial': i === 0 ? t.km_start : '',
        'Km Final': i === 0 ? (t.km_end ?? '') : '',
        'Km Recorridos': i === 0 ? (kmTraveled ?? '') : '',
        'Litros': f.liters,
        'Costo Combustible ($)': f.total_cost,
        'Offline': i === 0 ? (t.synced_offline ? 'Sí' : 'No') : '',
        '--- TOTALES ---': i === t.fuel_logs.length - 1 ? `${totalLiters}L / $${totalFuelCost}` : '',
      }))
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Registros')
    XLSX.writeFile(wb, `fleet-manager-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const totalKm = trips.reduce((s, t) => s + (t.km_end ? t.km_end - t.km_start : 0), 0)
  const totalCost = trips.reduce((s, t) => s + t.fuel_logs.reduce((sf, f) => sf + f.total_cost, 0), 0)

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Dashboard de Flota</h1>
            <p className="text-gray-400 text-sm">{trips.length} registro(s)</p>
          </div>
          <div className="flex gap-3">
            <a
              href="/"
              className="bg-gray-700 hover:bg-gray-600 px-5 py-2.5 rounded-xl font-semibold transition-colors"
            >
              🚛 Conductor
            </a>
            <a
              href="/vehicles"
              className="bg-gray-700 hover:bg-gray-600 px-5 py-2.5 rounded-xl font-semibold transition-colors"
            >
              🚗 Vehículos
            </a>
            <button
              onClick={exportXLSX}
              disabled={trips.length === 0}
              className="bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:cursor-not-allowed px-5 py-2.5 rounded-xl font-semibold transition-colors flex items-center gap-2"
            >
              📊 Exportar .xlsx
            </button>
          </div>
        </div>

        {/* Métricas rápidas */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Viajes', value: trips.length, icon: '🚗' },
            { label: 'Km totales', value: totalKm.toLocaleString('es-AR'), icon: '📍' },
            { label: 'Gasto combustible', value: `$${totalCost.toLocaleString('es-AR')}`, icon: '⛽' },
          ].map((m) => (
            <div key={m.label} className="bg-gray-900 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-3xl">{m.icon}</span>
              <div>
                <p className="text-gray-400 text-xs">{m.label}</p>
                <p className="text-xl font-bold">{m.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="bg-gray-900 rounded-2xl p-4 mb-4 flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 uppercase tracking-wider">Patente</label>
            <input
              type="text"
              placeholder="Filtrar..."
              value={filters.plate}
              onChange={(e) => setFilters((f) => ({ ...f, plate: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 uppercase tracking-wider">Desde</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 uppercase tracking-wider">Hasta</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => setFilters({ plate: '', dateFrom: '', dateTo: '' })}
            className="text-gray-400 hover:text-white text-sm transition-colors pb-0.5"
          >
            Limpiar filtros
          </button>
        </div>

        {/* Tabla */}
        <div className="bg-gray-900 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Patente</th>
                  <th className="text-left px-4 py-3">Inicio</th>
                  <th className="text-left px-4 py-3">Fin</th>
                  <th className="text-right px-4 py-3">Km Ini.</th>
                  <th className="text-right px-4 py-3">Km Fin</th>
                  <th className="text-right px-4 py-3">Recorrido</th>
                  <th className="text-right px-4 py-3">Litros</th>
                  <th className="text-right px-4 py-3">Costo ($)</th>
                  <th className="text-center px-4 py-3">Fotos</th>
                  <th className="text-center px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="text-center py-12 text-gray-500">Cargando...</td></tr>
                ) : trips.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-12 text-gray-500">No hay registros</td></tr>
                ) : (
                  trips.map((t) => {
                    const kmTraveled = t.km_end ? t.km_end - t.km_start : null
                    const totalLiters = t.fuel_logs.reduce((s, f) => s + f.liters, 0)
                    const totalCostTrip = t.fuel_logs.reduce((s, f) => s + f.total_cost, 0)
                    const photos = t.fuel_logs.filter((f) => f.photo_url)
                    return (
                      <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3 font-bold">{t.vehicles?.plate}</td>
                        <td className="px-4 py-3 text-gray-300">{new Date(t.started_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                        <td className="px-4 py-3 text-gray-300">{t.ended_at ? new Date(t.ended_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
                        <td className="px-4 py-3 text-right">{t.km_start.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">{t.km_end?.toLocaleString() ?? '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold">{kmTraveled ? `${kmTraveled.toLocaleString()} km` : '—'}</td>
                        <td className="px-4 py-3 text-right">{totalLiters > 0 ? `${totalLiters}L` : '—'}</td>
                        <td className="px-4 py-3 text-right">{totalCostTrip > 0 ? `$${totalCostTrip.toLocaleString()}` : '—'}</td>
                        <td className="px-4 py-3 text-center">
                          {photos.length > 0 ? (
                            <div className="flex gap-1 justify-center">
                              {photos.map((f, i) => (
                                <a key={i} href={f.photo_url!} target="_blank" rel="noopener noreferrer"
                                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-2 py-1 rounded-lg transition-colors">
                                  📷 {photos.length > 1 ? i + 1 : ''}
                                </a>
                              ))}
                            </div>
                          ) : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            t.status === 'open'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-green-500/20 text-green-400'
                          }`}>
                            {t.status === 'open' ? 'En curso' : 'Cerrado'}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
