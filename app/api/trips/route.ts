import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
export const dynamic = 'force-dynamic'
const getDb = () => getSupabaseAdmin()

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const plate = searchParams.get('plate')
  const from  = searchParams.get('from')
  const to    = searchParams.get('to')

  let query = getDb()
    .from('trips').select('*, vehicles(plate, type), fuel_logs(*)')
    .order('started_at', { ascending: false })

  if (plate) query = query.ilike('vehicles.plate', `%${plate}%`)
  if (from)  query = query.gte('started_at', from)
  if (to)    query = query.lte('started_at', `${to}T23:59:59`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
