-- ============================================================
-- Migration: 001_analytics_schema.sql
--
-- How to run:
--   psql: psql $DATABASE_URL -f backend/db/migrations/001_analytics_schema.sql
--   Supabase SQL editor: paste the contents of this file and click "Run"
--
-- This migration is idempotent — safe to re-run at any time.
-- ============================================================

-- occupancy_snapshots: time-series record per floor per interval
CREATE TABLE IF NOT EXISTS occupancy_snapshots (
  id              SERIAL PRIMARY KEY,
  recorded_at     TIMESTAMPTZ   NOT NULL,
  floor_level     VARCHAR(50)   NOT NULL,
  total_slots     INTEGER       NOT NULL CHECK (total_slots >= 0),
  booked_slots    INTEGER       NOT NULL CHECK (booked_slots >= 0),
  available_slots INTEGER       NOT NULL CHECK (available_slots >= 0),
  occupancy_rate  NUMERIC(5, 2) NOT NULL,
  is_outlier      BOOLEAN       NOT NULL DEFAULT FALSE,

  CONSTRAINT chk_booked_lte_total
    CHECK (booked_slots <= total_slots)
);

-- pipeline_runs: stores ETL data quality reports as JSONB
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id            SERIAL PRIMARY KEY,
  run_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  report        JSONB       NOT NULL
);

-- Index: composite for per-floor time-series queries
CREATE INDEX IF NOT EXISTS idx_snapshots_floor_time
  ON occupancy_snapshots (floor_level, recorded_at DESC);

-- Index: time-range dashboard queries
CREATE INDEX IF NOT EXISTS idx_snapshots_time
  ON occupancy_snapshots (recorded_at DESC);

-- Index: historical booking queries
CREATE INDEX IF NOT EXISTS idx_bookings_start_time
  ON bookings (start_time DESC);
