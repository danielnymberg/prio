-- ============================================
-- ADD MISSING FIELDS TO PROJECTS AND TASKS
-- Created: 2025-10-25
-- Description: Lägg till start_date, actual_duration, och Spiris-kolumner
--              Använder IF NOT EXISTS för säker idempotent migration
-- ============================================

-- ============================================
-- PROJECTS TABLE - ADD MISSING COLUMNS
-- ============================================

-- start_date (används i ProjectForm men saknades i DB schema)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE projects ADD COLUMN start_date DATE;
    COMMENT ON COLUMN projects.start_date IS 'Projektets startdatum';
  END IF;
END $$;

-- Spiris integration columns (för framtida synkronisering)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'spiris_project_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN spiris_project_id TEXT;
    COMMENT ON COLUMN projects.spiris_project_id IS 'Spiris projekt-ID för synkronisering';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'spiris_last_sync'
  ) THEN
    ALTER TABLE projects ADD COLUMN spiris_last_sync TIMESTAMPTZ;
    COMMENT ON COLUMN projects.spiris_last_sync IS 'Senaste synkronisering med Spiris API';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'spiris_sync_enabled'
  ) THEN
    ALTER TABLE projects ADD COLUMN spiris_sync_enabled BOOLEAN DEFAULT FALSE;
    COMMENT ON COLUMN projects.spiris_sync_enabled IS 'Om synkronisering med Spiris är aktiverad';
  END IF;
END $$;

-- Resursplanering från Spiris (läggs till vid synk)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'budgeted_hours'
  ) THEN
    ALTER TABLE projects ADD COLUMN budgeted_hours NUMERIC;
    COMMENT ON COLUMN projects.budgeted_hours IS 'Budgeterade timmar (från Spiris)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'budgeted_revenue'
  ) THEN
    ALTER TABLE projects ADD COLUMN budgeted_revenue NUMERIC;
    COMMENT ON COLUMN projects.budgeted_revenue IS 'Budgeterad intäkt (från Spiris)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'invoiced_hours'
  ) THEN
    ALTER TABLE projects ADD COLUMN invoiced_hours NUMERIC;
    COMMENT ON COLUMN projects.invoiced_hours IS 'Fakturerade timmar (från Spiris)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'invoiced_amount'
  ) THEN
    ALTER TABLE projects ADD COLUMN invoiced_amount NUMERIC;
    COMMENT ON COLUMN projects.invoiced_amount IS 'Fakturerat belopp (från Spiris)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'actual_hours_worked'
  ) THEN
    ALTER TABLE projects ADD COLUMN actual_hours_worked NUMERIC;
    COMMENT ON COLUMN projects.actual_hours_worked IS 'Faktiskt arbetade timmar (från Spiris)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'project_manager'
  ) THEN
    ALTER TABLE projects ADD COLUMN project_manager TEXT;
    COMMENT ON COLUMN projects.project_manager IS 'Projektledare (från Spiris)';
  END IF;
END $$;

-- ============================================
-- TASKS TABLE - ADD ACTUAL_DURATION
-- ============================================

-- actual_duration för faktisk loggad tid (i minuter, samma format som estimated_duration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'actual_duration'
  ) THEN
    ALTER TABLE tasks ADD COLUMN actual_duration INTEGER;
    COMMENT ON COLUMN tasks.actual_duration IS 'Faktiskt loggad tid i minuter (från tidsrapportering)';
  END IF;
END $$;

-- scheduled_start (kanske redan finns, men säkrar att den finns)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'scheduled_start'
  ) THEN
    ALTER TABLE tasks ADD COLUMN scheduled_start TIMESTAMPTZ;
    COMMENT ON COLUMN tasks.scheduled_start IS 'När uppgiften är planerad att påbörjas';
  END IF;
END $$;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_projects_start_date ON projects(start_date);
CREATE INDEX IF NOT EXISTS idx_projects_spiris_id ON projects(spiris_project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_actual_duration ON tasks(actual_duration);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_start ON tasks(scheduled_start);

-- ============================================
-- VERIFICATION
-- ============================================

-- Verifiera att kolumnerna nu finns
DO $$
DECLARE
  projects_count INTEGER;
  tasks_count INTEGER;
BEGIN
  -- Räkna projects columns
  SELECT COUNT(*) INTO projects_count
  FROM information_schema.columns
  WHERE table_name = 'projects'
    AND column_name IN ('start_date', 'spiris_project_id', 'spiris_last_sync', 'spiris_sync_enabled',
                        'budgeted_hours', 'budgeted_revenue', 'invoiced_hours', 'invoiced_amount',
                        'actual_hours_worked', 'project_manager');

  -- Räkna tasks columns
  SELECT COUNT(*) INTO tasks_count
  FROM information_schema.columns
  WHERE table_name = 'tasks'
    AND column_name IN ('actual_duration', 'scheduled_start');

  RAISE NOTICE 'Migration completed: % new projects columns, % new tasks columns', projects_count, tasks_count;
END $$;
