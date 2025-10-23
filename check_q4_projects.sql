-- Q4 Resursplanering: Projekt med deadline före 2025-12-31
SELECT 
  name,
  client_name,
  project_deadline::date as deadline,
  budgeted_hours,
  invoiced_hours,
  (budgeted_hours - COALESCE(invoiced_hours, 0)) as remaining_hours,
  ROUND((COALESCE(invoiced_hours, 0) / NULLIF(budgeted_hours, 0) * 100)::numeric, 0) as completion_pct
FROM projects
WHERE user_id = '594ba863-a738-4272-be92-b5602165e7dd'
  AND spiris_project_id IS NOT NULL
  AND project_deadline IS NOT NULL
  AND project_deadline::date <= '2025-12-31'
ORDER BY project_deadline;
