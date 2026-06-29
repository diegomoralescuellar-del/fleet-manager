import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'

const DRIVER_ID = '20248e43-d078-46d6-a4ed-3d314484419f'

export async function POST(req: Request) {
  const { vehicle_id, km_start, trip_id, started_at } = await req.json()
  if (!vehicle_id || !km_start || !trip_id)
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const { error } = await supabase.from('trips').insert({
    id: trip_id, vehicle_id, driver_id: DRIVER_ID, km_start, started_at, status: 'open',
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('vehicles').update({ status: 'in_use' }).eq('id', vehicle_id)
  return NextResponse.json({ ok: true })
}
