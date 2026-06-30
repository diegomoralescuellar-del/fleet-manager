import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
export const dynamic = 'force-dynamic'
const getDb = () => getSupabaseAdmin()

export async function POST(req: Request) {
  const { trip_id, vehicle_id, km_end, ended_at } = await req.json()
  if (!trip_id || !km_end)
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const { error } = await getDb()
    .from('trips').update({ km_end, ended_at, status: 'closed' } as any).eq('id', trip_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Estado del vehículo solo lo modifica el admin desde el panel

  return NextResponse.json({ ok: true })
}
