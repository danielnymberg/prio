-- ============================================
-- CAPACITY TIMELINE - DATABASE SCHEMA
-- Created: 2025-10-11
-- Description: Frånvaroperioder och kapacitetsinställningar
-- ============================================

-- Frånvaroperioder (semester, sjuk, etc)
CREATE TABLE IF NOT EXISTS absence_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  absence_percentage INTEGER NOT NULL CHECK (absence_percentage BETWEEN 0 AND 100),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE absence_periods IS 'Frånvaroperioder för kapacitetsberäkning';
COMMENT ON COLUMN absence_periods.absence_percentage IS '0-100%: 0=fullt tillgänglig, 100=helt frånvarande';

-- Index
CREATE INDEX IF NOT EXISTS absence_periods_user_id_idx ON absence_periods(user_id);
CREATE INDEX IF NOT EXISTS absence_periods_dates_idx ON absence_periods(start_date, end_date);

-- RLS
ALTER TABLE absence_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own absence periods" ON absence_periods;
CREATE POLICY "Users can view own absence periods"
  ON absence_periods FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own absence periods" ON absence_periods;
CREATE POLICY "Users can insert own absence periods"
  ON absence_periods FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own absence periods" ON absence_periods;
CREATE POLICY "Users can update own absence periods"
  ON absence_periods FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own absence periods" ON absence_periods;
CREATE POLICY "Users can delete own absence periods"
  ON absence_periods FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger
DROP TRIGGER IF EXISTS update_absence_periods_updated_at ON absence_periods;
CREATE TRIGGER update_absence_periods_updated_at
  BEFORE UPDATE ON absence_periods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Uppdatera profiles-tabellen
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS working_hours_per_week INTEGER DEFAULT 40,
  ADD COLUMN IF NOT EXISTS working_days INTEGER[] DEFAULT ARRAY[2,3,4,5,6],
  ADD COLUMN IF NOT EXISTS capacity_thresholds JSONB DEFAULT '{
    "under": 70,
    "sweet_start": 70,
    "sweet_end": 80,
    "over": 90
  }'::jsonb;

COMMENT ON COLUMN profiles.working_hours_per_week IS 'Arbetstimmar per vecka för kapacitetsberäkning';
COMMENT ON COLUMN profiles.working_days IS 'Arbetsdagar (1=Sön, 2=Mån, ..., 7=Lör)';
COMMENT ON COLUMN profiles.capacity_thresholds IS 'Tröskelvärden för beläggningsnivåer i %';
