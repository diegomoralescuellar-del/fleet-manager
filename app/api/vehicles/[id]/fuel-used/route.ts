import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
export const dynamic = 'force-dynamic'
const getDb = () => getSupabaseAdmin()

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const start = new Date()
  start.setDate(1); start.setHours(0, 0, 0, 0)
  const { data } = await getDb()
    .from('fuel_logs')
    .select('total_cost, trips!inner(vehicle_id)')
    .eq('trips.vehicle_id', id)
    .gte('logged_at', start.toISOString())
  const used = (data ?? []).reduce((s: number, f: { total_cost: number }) => s + f.total_cost, 0)
  return NextResponse.json({ used })
}
