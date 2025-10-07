-- Lägg till priority_flag kolumn för CPM v2.0 Priority Flags-systemet
-- Version: 2.0 (2025-10-07)

-- Steg 1: Lägg till kolumnen
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS priority_flag TEXT;

-- Steg 2: Lägg till CHECK constraint (separat statement)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tasks_priority_flag_check'
  ) THEN
    ALTER TABLE tasks
    ADD CONSTRAINT tasks_priority_flag_check
    CHECK (priority_flag IN ('asap', 'whenever', 'someday'));
  END IF;
END $$;

-- Steg 3: Lägg till kommentar
COMMENT ON COLUMN tasks.priority_flag IS 'Priority flag för tasks utan deadline: asap (gör snart +50%), whenever (normal), someday (backlog -30%)';

-- Steg 4: Sätt default för befintliga tasks utan deadline
UPDATE tasks
SET priority_flag = 'whenever'
WHERE priority_flag IS NULL AND deadline IS NULL AND status != 'done';

-- Steg 5: Tasks med deadline får priority_flag = null (redan null, men för tydlighet)
UPDATE tasks
SET priority_flag = NULL
WHERE deadline IS NOT NULL;
