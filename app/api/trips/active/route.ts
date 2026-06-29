import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
export const dynamic = 'force-dynamic'
const getDb = () => getSupabaseAdmin()

export async function GET() {
  const { data } = await getDb()
    .from('trips').select('*, vehicles(plate, type, vtv_url, fuel_limit)')
    .eq('status', 'open').order('started_at', { ascending: false }).limit(1).single()
  return NextResponse.json(data ?? null)
}
