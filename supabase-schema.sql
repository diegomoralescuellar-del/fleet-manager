-- ==============================================
-- FLEET MANAGER - Schema de Base de Datos
-- Ejecutar en: Supabase → SQL Editor
-- ==============================================

-- Tabla: vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL CHECK (type IN ('auto', 'camion', 'moto', 'otro')),
  plate       TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'available'
                CHECK (status IN ('available', 'in_use', 'maintenance')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Tabla: trips
CREATE TABLE IF NOT EXISTS trips (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id      UUID NOT NULL REFERENCES vehicles(id),
  driver_id       UUID NOT NULL REFERENCES auth.users(id),
  km_start        NUMERIC(10,1) NOT NULL,
  km_end          NUMERIC(10,1),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at        TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'closed')),
  synced_offline  BOOLEAN DEFAULT false,
  CONSTRAINT km_end_gt_start CHECK (km_end IS NULL OR km_end > km_start)
);

-- Tabla: fuel_logs
CREATE TABLE IF NOT EXISTS fuel_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  liters       NUMERIC(8,2) NOT NULL CHECK (liters > 0),
  total_cost   NUMERIC(10,2) NOT NULL CHECK (total_cost > 0),
  photo_url    TEXT,
  logged_at    TIMESTAMPTZ DEFAULT now()
);

-- ==============================================
-- Row Level Security (RLS)
-- ==============================================

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_logs ENABLE ROW LEVEL SECURITY;

-- Choferes: pueden leer vehículos disponibles
CREATE POLICY "vehicles_read" ON vehicles
  FOR SELECT TO authenticated USING (true);

-- Choferes: pueden leer y crear sus propios trips
CREATE POLICY "trips_driver_read" ON trips
  FOR SELECT TO authenticated USING (driver_id = auth.uid());

CREATE POLICY "trips_driver_insert" ON trips
  FOR INSERT TO authenticated WITH CHECK (driver_id = auth.uid());

CREATE POLICY "trips_driver_update" ON trips
  FOR UPDATE TO authenticated USING (driver_id = auth.uid());

-- Choferes: pueden leer y crear fuel_logs de sus trips
CREATE POLICY "fuel_logs_driver_read" ON fuel_logs
  FOR SELECT TO authenticated
  USING (trip_id IN (SELECT id FROM trips WHERE driver_id = auth.uid()));

CREATE POLICY "fuel_logs_driver_insert" ON fuel_logs
  FOR INSERT TO authenticated
  WITH CHECK (trip_id IN (SELECT id FROM trips WHERE driver_id = auth.uid()));

-- Admins: acceso total (basado en user metadata)
CREATE POLICY "admin_full_vehicles" ON vehicles TO authenticated
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin')
  WITH CHECK ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');

CREATE POLICY "admin_full_trips" ON trips TO authenticated
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin')
  WITH CHECK ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');

CREATE POLICY "admin_full_fuel_logs" ON fuel_logs TO authenticated
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin')
  WITH CHECK ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');

-- ==============================================
-- Storage bucket para fotos
-- ==============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('fleet-photos', 'fleet-photos', true)
ON CONFLICT DO NOTHING;

-- Choferes pueden subir fotos
CREATE POLICY "fleet_photos_upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'fleet-photos');

CREATE POLICY "fleet_photos_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'fleet-photos');

-- ==============================================
-- Datos de prueba (opcional)
-- ==============================================

INSERT INTO vehicles (type, plate) VALUES
  ('camion', 'ABC-123'),
  ('auto', 'XYZ-456'),
  ('camion', 'DEF-789')
ON CONFLICT DO NOTHING;
