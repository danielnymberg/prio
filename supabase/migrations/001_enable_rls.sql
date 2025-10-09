-- Säkerhetsmigration: Aktivera Row Level Security (RLS)
-- Kör denna i Supabase SQL Editor

-- ==========================================
-- 1. TASKS TABLE
-- ==========================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Användare kan läsa sina egna tasks
CREATE POLICY "Users can read own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

-- Användare kan skapa tasks för sig själva
CREATE POLICY "Users can insert own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Användare kan uppdatera sina egna tasks
CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Användare kan radera sina egna tasks
CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- ==========================================
-- 2. PROJECTS TABLE
-- ==========================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Användare kan läsa sina egna projekt
CREATE POLICY "Users can read own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

-- Användare kan skapa projekt för sig själva
CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Användare kan uppdatera sina egna projekt
CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Användare kan radera sina egna projekt
CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- ==========================================
-- 3. EMAIL_TASKS TABLE
-- ==========================================
ALTER TABLE email_tasks ENABLE ROW LEVEL SECURITY;

-- Användare kan läsa sina egna email tasks
CREATE POLICY "Users can read own email tasks"
  ON email_tasks FOR SELECT
  USING (auth.uid() = user_id);

-- Användare kan skapa email tasks för sig själva
CREATE POLICY "Users can insert own email tasks"
  ON email_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Användare kan uppdatera sina egna email tasks
CREATE POLICY "Users can update own email tasks"
  ON email_tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Användare kan radera sina egna email tasks
CREATE POLICY "Users can delete own email tasks"
  ON email_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- ==========================================
-- 4. PROFILES TABLE (om den finns)
-- ==========================================
-- OBS: Kör bara detta om du har en profiles-tabell

-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can read own profile"
--   ON profiles FOR SELECT
--   USING (auth.uid() = id);

-- CREATE POLICY "Users can update own profile"
--   ON profiles FOR UPDATE
--   USING (auth.uid() = id)
--   WITH CHECK (auth.uid() = id);

-- ==========================================
-- 5. VERIFICATION QUERIES
-- ==========================================

-- Verifiera att RLS är aktiverat
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('tasks', 'projects', 'email_tasks', 'profiles');

-- Visa alla policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
