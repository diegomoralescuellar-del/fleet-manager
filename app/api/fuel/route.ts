import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
export const dynamic = 'force-dynamic'
const getDb = () => getSupabaseAdmin()

export async function POST(req: Request) {
  const { trip_id, liters, total_cost, photo_url, logged_at } = await req.json()
  if (!trip_id || !liters || !total_cost)
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const { error } = await getDb().from('fuel_logs').insert({
    trip_id, liters, total_cost, photo_url: photo_url ?? null, logged_at,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
