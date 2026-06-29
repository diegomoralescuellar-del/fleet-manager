import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'

export async function GET() {
  const { data } = await supabase
    .from('trips').select('*, vehicles(plate, type)')
    .eq('status', 'open').order('started_at', { ascending: false }).limit(1).single()
  return NextResponse.json(data ?? null)
}
