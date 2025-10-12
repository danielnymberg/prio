-- Ta bort alla scheduled_start värden så att tasks blir oschemalagda
-- Kör detta i Supabase SQL Editor om du vill börja om från scratch

UPDATE tasks
SET scheduled_start = NULL
WHERE scheduled_start IS NOT NULL;

-- Visa alla tasks som nu är oschemalagda
SELECT id, title, scheduled_start, status
FROM tasks
WHERE status != 'done'
ORDER BY priority DESC;
