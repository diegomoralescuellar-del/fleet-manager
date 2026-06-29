import { openDB, IDBPDatabase } from 'idb'
import { supabase } from './supabase'

const DB_NAME = 'fleet-manager-offline'
const DB_VERSION = 1
const STORE_NAME = 'pending-operations'

type OperationType = 'start-trip' | 'add-fuel' | 'end-trip'

type PendingOperation = {
  id: string
  type: OperationType
  payload: Record<string, unknown>
  timestamp: number
  retries: number
}

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    },
  })
}

export async function queueOperation(type: OperationType, payload: Record<string, unknown>) {
  const db = await getDB()
  const op: PendingOperation = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    payload,
    timestamp: Date.now(),
    retries: 0,
  }
  await db.put(STORE_NAME, op)
  return op.id
}

export async function getPendingCount(): Promise<number> {
  const db = await getDB()
  return db.count(STORE_NAME)
}

export async function syncPendingOperations(): Promise<{ synced: number; failed: number }> {
  const db = await getDB()
  const pending: PendingOperation[] = await db.getAll(STORE_NAME)

  let synced = 0
  let failed = 0

  for (const op of pending) {
    try {
      await executeOperation(op)
      await db.delete(STORE_NAME, op.id)
      synced++
    } catch {
      op.retries++
      if (op.retries >= 3) {
        await db.delete(STORE_NAME, op.id)
        failed++
      } else {
        await db.put(STORE_NAME, op)
      }
    }
  }

  return { synced, failed }
}

async function executeOperation(op: PendingOperation) {
  switch (op.type) {
    case 'start-trip': {
      const { error } = await supabase
        .from('trips')
        .insert({ ...op.payload, synced_offline: true })
      if (error) throw error
      break
    }
    case 'add-fuel': {
      const { error } = await supabase.from('fuel_logs').insert(op.payload)
      if (error) throw error
      break
    }
    case 'end-trip': {
      const { id, ...update } = op.payload as { id: string; [key: string]: unknown }
      const { error } = await supabase.from('trips').update(update).eq('id', id)
      if (error) throw error
      break
    }
  }
}
