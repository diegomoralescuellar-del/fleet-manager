import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Vehicle = {
  id: string
  type: 'auto' | 'camion' | 'moto' | 'otro'
  plate: string
  status: 'available' | 'in_use' | 'maintenance'
  created_at: string
}

export type Trip = {
  id: string
  vehicle_id: string
  driver_id: string
  km_start: number
  km_end: number | null
  started_at: string
  ended_at: string | null
  status: 'open' | 'closed'
  synced_offline: boolean
}

export type FuelLog = {
  id: string
  trip_id: string
  liters: number
  total_cost: number
  photo_url: string | null
  logged_at: string
}

export type TripWithDetails = Trip & {
  vehicles: Pick<Vehicle, 'plate' | 'type'>
  fuel_logs: FuelLog[]
}
