import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data } = await supabase
    .from('trips').select('km_end').eq('vehicle_id', id).eq('status', 'closed')
    .not('km_end', 'is', null).order('ended_at', { ascending: false }).limit(1).single()
  return NextResponse.json({ km: data?.km_end ?? null })
}
