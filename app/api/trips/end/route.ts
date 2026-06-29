import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const { trip_id, vehicle_id, km_end, ended_at } = await req.json()
  if (!trip_id || !km_end)
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const { error } = await supabase
    .from('trips').update({ km_end, ended_at, status: 'closed' }).eq('id', trip_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (vehicle_id)
    await supabase.from('vehicles').update({ status: 'available' }).eq('id', vehicle_id)

  return NextResponse.json({ ok: true })
}
