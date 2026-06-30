import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
export const dynamic = 'force-dynamic'
const getDb = () => getSupabaseAdmin()

export async function GET() {
  const { data: vehicles, error } = await getDb().from('vehicles').select('*').order('plate')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sum km per vehicle from closed trips
  const { data: trips } = await getDb()
    .from('trips')
    .select('vehicle_id, km_start, km_end')
    .eq('status', 'closed')
    .not('km_end', 'is', null)

  const kmByVehicle: Record<string, number> = {}
  for (const t of trips ?? []) {
    const km = (t.km_end ?? 0) - (t.km_start ?? 0)
    if (km > 0) kmByVehicle[t.vehicle_id] = (kmByVehicle[t.vehicle_id] ?? 0) + km
  }

  const result = (vehicles ?? []).map((v: any) => ({ ...v, total_km: kmByVehicle[v.id] ?? 0 }))
  return NextResponse.json(result)
}
