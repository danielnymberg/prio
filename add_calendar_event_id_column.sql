-- ============================================
-- MIGRATION: Add calendar_event_id to tasks
-- ============================================
-- Detta skript lägger till calendar_event_id kolumnen i tasks-tabellen
-- för att kunna länka MinPrio tasks med Microsoft Calendar events.
--
-- Kör detta i Supabase SQL Editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
-- ============================================

-- Lägg till calendar_event_id kolumn
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS calendar_event_id TEXT NULL;

-- Lägg till index för snabbare lookups
CREATE INDEX IF NOT EXISTS idx_tasks_calendar_event_id
ON tasks(calendar_event_id);

-- Lägg till kommentar för dokumentation
COMMENT ON COLUMN tasks.calendar_event_id IS 'Microsoft Calendar event ID för synkronisering med Outlook. Null = inte synkat till kalender.';

-- Verifiera att kolumnen lades till
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'tasks'
  AND column_name = 'calendar_event_id';

-- Visa nuvarande tasks med scheduled_start (dessa kommer få calendar_event_id när de nästa gång schemaläggs)
SELECT
  id,
  title,
  scheduled_start,
  calendar_event_id,
  status
FROM tasks
WHERE scheduled_start IS NOT NULL
  AND status != 'done'
ORDER BY scheduled_start
LIMIT 10;
