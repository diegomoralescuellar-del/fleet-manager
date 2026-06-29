import { z } from 'zod'

const positiveNumber = (field: string) =>
  z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : Number(v)),
    z.number({ message: `Ingresá ${field}` }).positive(`${field} debe ser mayor a 0`)
  )

export const tripStartSchema = z.object({
  vehicle_id: z.string().uuid('Seleccioná un vehículo'),
  km_start: positiveNumber('el kilometraje'),
})

export const fuelSchema = z.object({
  liters: positiveNumber('los litros'),
  total_cost: positiveNumber('el costo'),
  photo_url: z.string().optional(),
})

export const tripEndSchema = z.object({
  km_end: positiveNumber('el kilometraje final'),
})

export type TripStartInput = z.infer<typeof tripStartSchema>
export type FuelInput = z.infer<typeof fuelSchema>
export type TripEndInput = z.infer<typeof tripEndSchema>
