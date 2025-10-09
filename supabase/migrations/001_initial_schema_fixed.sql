-- ============================================
-- PRIO APP - INITIAL SCHEMA (FIXED)
-- Created: 2025-10-09
-- Description: Complete database schema matching actual data
-- ============================================

-- Update function (used by multiple tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- ============================================
-- PROJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) > 0 AND char_length(name) <= 100),
  description TEXT,
  color TEXT DEFAULT '#6B7280',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),

  -- Project management fields
  quoted_hours NUMERIC,
  hourly_rate NUMERIC,
  external_costs NUMERIC,
  total_budget NUMERIC,
  project_deadline TIMESTAMPTZ,
  client_name TEXT,
  completion_percentage INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE projects IS 'Prio app: Project grouping for tasks';

-- ============================================
-- TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) > 0 AND char_length(title) <= 100),
  description TEXT,
  importance INTEGER NOT NULL DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
  urgency INTEGER NOT NULL DEFAULT 10 CHECK (urgency BETWEEN 1 AND 10),
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'done')),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  priority_flag TEXT CHECK (priority_flag IN ('asap', 'whenever', 'someday')),

  -- AI-genererade fält
  estimated_duration INTEGER, -- minuter
  value_score INTEGER, -- 1-10
  time_sensitivity INTEGER, -- 1-10
  confidence INTEGER, -- 1-10
  effort INTEGER, -- 1-10
  complexity INTEGER, -- 1-10
  energy_required TEXT CHECK (energy_required IN ('low', 'medium', 'high')),

  -- Consequence analysis
  consequence_1week TEXT,
  consequence_1month TEXT,
  consequence_1year TEXT,
  consequence_deadline TEXT,

  -- Dependencies
  blocks_task_ids JSONB,
  blocked_by_task_ids JSONB,

  -- Result tracking
  result_impact INTEGER, -- 1-10

  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ,

  -- Microsoft Calendar integration
  calendar_event_id TEXT -- Microsoft Graph event ID
);

COMMENT ON TABLE tasks IS 'Prio app: Tasks with CPM prioritization';
COMMENT ON COLUMN tasks.priority_flag IS 'Priority flag för tasks utan deadline: asap (+50%), whenever (normal), someday (-30%)';
COMMENT ON COLUMN tasks.calendar_event_id IS 'Microsoft Calendar event ID if task is scheduled';

-- Computed priority column
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority NUMERIC GENERATED ALWAYS AS (
  (importance::NUMERIC * 0.6 + urgency::NUMERIC * 0.4)
) STORED;

COMMENT ON COLUMN tasks.priority IS 'Auto-calculated: importance*0.6 + urgency*0.4';

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,

  -- Onboarding
  onboarding_completed BOOLEAN DEFAULT FALSE,
  microsoft_connected BOOLEAN DEFAULT FALSE,

  -- Beta testing
  is_beta_tester BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'User profiles and preferences';

-- ============================================
-- EMAIL TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS email_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  task_data JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

COMMENT ON TABLE email_tasks IS 'Email-to-task queue: Mejl processas av Claude och skapar tasks automatiskt';

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Tasks indexes
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON tasks(user_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
CREATE INDEX IF NOT EXISTS tasks_deadline_idx ON tasks(deadline);
CREATE INDEX IF NOT EXISTS tasks_importance_idx ON tasks(importance);
CREATE INDEX IF NOT EXISTS tasks_urgency_idx ON tasks(urgency);
CREATE INDEX IF NOT EXISTS tasks_priority_idx ON tasks(priority DESC);
CREATE INDEX IF NOT EXISTS tasks_project_id_idx ON tasks(project_id);
CREATE INDEX IF NOT EXISTS tasks_completed_at_idx ON tasks(completed_at);
CREATE INDEX IF NOT EXISTS tasks_calendar_event_id_idx ON tasks(calendar_event_id);

-- Projects indexes
CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);
CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(status);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Email tasks indexes
CREATE INDEX IF NOT EXISTS idx_email_tasks_user_processed ON email_tasks(user_id, processed);
CREATE INDEX IF NOT EXISTS idx_email_tasks_created ON email_tasks(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_tasks ENABLE ROW LEVEL SECURITY;

-- Tasks policies
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
CREATE POLICY "Users can view own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
CREATE POLICY "Users can insert own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;
CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Projects policies
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own projects" ON projects;
CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- Profiles policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Email tasks policies
DROP POLICY IF EXISTS "Users can view their own email tasks" ON email_tasks;
CREATE POLICY "Users can view their own email tasks"
  ON email_tasks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own email tasks" ON email_tasks;
CREATE POLICY "Users can update their own email tasks"
  ON email_tasks FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Tasks updated_at trigger
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Projects updated_at trigger
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Profiles updated_at trigger
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tasks completed_at trigger (auto-set when status = 'done')
CREATE OR REPLACE FUNCTION update_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND (OLD.status IS NULL OR OLD.status != 'done') THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status != 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_task_completed_at ON tasks;
CREATE TRIGGER set_task_completed_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_task_completed_at();

-- Email tasks processed_at trigger
CREATE OR REPLACE FUNCTION set_email_task_processed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.processed = true AND OLD.processed = false THEN
    NEW.processed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS email_task_processed_trigger ON email_tasks;
CREATE TRIGGER email_task_processed_trigger
  BEFORE UPDATE ON email_tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_email_task_processed_at();

-- Auto-create profile when new user signs up
CREATE OR REPLACE FUNCTION create_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_on_signup();

-- ============================================
-- REALTIME
-- ============================================

-- Enable realtime för email_tasks (så frontend får notifieringar)
ALTER PUBLICATION supabase_realtime ADD TABLE email_tasks;

-- ============================================
-- DONE!
-- ============================================

-- Verifiera att RLS är aktiverat:
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('tasks', 'projects', 'profiles', 'email_tasks');

-- Förväntat resultat: rowsecurity = t (true) för alla tabeller
