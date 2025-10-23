-- ============================================
-- PROJECT ALLOCATIONS TABLE
-- Created: 2025-10-23
-- Description: Veckovis allokering av timmar per projekt
-- ============================================

CREATE TABLE IF NOT EXISTS project_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,  -- Måndag i veckan (YYYY-MM-DD)
  allocated_hours DECIMAL(5,2) NOT NULL CHECK (allocated_hours >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, project_id, week_start)
);

COMMENT ON TABLE project_allocations IS 'Veckovis resursallokering per projekt';
COMMENT ON COLUMN project_allocations.week_start IS 'Måndag i veckan (ISO week start)';
COMMENT ON COLUMN project_allocations.allocated_hours IS 'Planerade timmar för denna vecka';

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_project_allocations_user ON project_allocations(user_id);
CREATE INDEX IF NOT EXISTS idx_project_allocations_project ON project_allocations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_allocations_week ON project_allocations(week_start);
CREATE INDEX IF NOT EXISTS idx_project_allocations_user_week ON project_allocations(user_id, week_start);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE project_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own allocations" ON project_allocations;
CREATE POLICY "Users can view own allocations"
  ON project_allocations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own allocations" ON project_allocations;
CREATE POLICY "Users can insert own allocations"
  ON project_allocations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own allocations" ON project_allocations;
CREATE POLICY "Users can update own allocations"
  ON project_allocations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own allocations" ON project_allocations;
CREATE POLICY "Users can delete own allocations"
  ON project_allocations FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_project_allocations_updated_at ON project_allocations;
CREATE TRIGGER update_project_allocations_updated_at
  BEFORE UPDATE ON project_allocations
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();
