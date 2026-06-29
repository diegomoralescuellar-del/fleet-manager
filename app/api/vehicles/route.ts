import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
export const dynamic = 'force-dynamic'
const getDb = () => getSupabaseAdmin()

export async function GET() {
  const { data, error } = await getDb()
    .from('vehicles').select('*').neq('status', 'maintenance').order('plate')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: Request) {
  const { type, plate } = await req.json()
  if (!type || !plate)
    return NextResponse.json({ error: 'type y plate son requeridos' }, { status: 400 })
  const { data, error } = await getDb()
    .from('vehicles').insert({ type, plate: plate.toUpperCase() } as any).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
