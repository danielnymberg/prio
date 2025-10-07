-- Lägg till priority_flag kolumn för CPM v2.0 Priority Flags-systemet
-- Version: 2.0 (2025-10-07)

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS priority_flag TEXT
CHECK (priority_flag IN ('asap', 'whenever', 'someday'));

COMMENT ON COLUMN tasks.priority_flag IS 'Priority flag för tasks utan deadline: asap (gör snart +50%), whenever (normal), someday (backlog -30%)';

-- Sätt default för befintliga tasks utan deadline
UPDATE tasks
SET priority_flag = 'whenever'
WHERE priority_flag IS NULL AND deadline IS NULL AND status != 'done';

-- Tasks med deadline får priority_flag = null
UPDATE tasks
SET priority_flag = NULL
WHERE deadline IS NOT NULL;
