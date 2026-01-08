-- Step 1: Backfill leave_type_id for existing logs that don't have it
UPDATE leave_balance_logs
SET 
  leave_type_id = lt.id,
  year = COALESCE(leave_balance_logs.year, EXTRACT(YEAR FROM COALESCE(leave_balance_logs.effective_date, leave_balance_logs.created_at))::integer),
  action = COALESCE(leave_balance_logs.action, 'manual_adjustment')
FROM leave_types lt, employees e
WHERE leave_balance_logs.employee_id = e.id 
AND e.organization_id = lt.organization_id
AND leave_balance_logs.leave_type = lt.name
AND leave_balance_logs.leave_type_id IS NULL;

-- Step 2: Recalculate all leave_type_balances from the corrected logs
WITH log_totals AS (
  SELECT 
    employee_id,
    leave_type_id,
    year,
    SUM(change_amount) as total_change
  FROM leave_balance_logs
  WHERE leave_type_id IS NOT NULL AND year IS NOT NULL
  GROUP BY employee_id, leave_type_id, year
)
UPDATE leave_type_balances ltb
SET 
  balance = COALESCE(lt.total_change, 0),
  updated_at = now()
FROM log_totals lt
WHERE ltb.employee_id = lt.employee_id
AND ltb.leave_type_id = lt.leave_type_id
AND ltb.year = lt.year;

-- Step 3: Insert missing balance records for employees who have logs but no balance record
INSERT INTO leave_type_balances (employee_id, leave_type_id, organization_id, balance, year)
SELECT 
  lbl.employee_id,
  lbl.leave_type_id,
  e.organization_id,
  SUM(lbl.change_amount),
  lbl.year
FROM leave_balance_logs lbl
JOIN employees e ON e.id = lbl.employee_id
WHERE lbl.leave_type_id IS NOT NULL 
AND lbl.year IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM leave_type_balances ltb
  WHERE ltb.employee_id = lbl.employee_id
  AND ltb.leave_type_id = lbl.leave_type_id
  AND ltb.year = lbl.year
)
GROUP BY lbl.employee_id, lbl.leave_type_id, e.organization_id, lbl.year;