-- Recalculate all leave_type_balances from the sum of leave_balance_logs
-- This fixes doubled balances caused by direct inserts + trigger double-counting

-- Step 1: Calculate correct balances from logs
WITH calculated_balances AS (
  SELECT 
    l.employee_id,
    l.leave_type_id,
    l.year,
    SUM(l.change_amount) as correct_balance
  FROM leave_balance_logs l
  WHERE l.leave_type_id IS NOT NULL
    AND l.action IN ('year_allocation', 'year_init', 'carry_forward_in', 'manual_adjustment', 'leave_deduct')
  GROUP BY l.employee_id, l.leave_type_id, l.year
)
-- Step 2: Update balances that don't match
UPDATE leave_type_balances b
SET 
  balance = c.correct_balance,
  updated_at = now()
FROM calculated_balances c
WHERE b.employee_id = c.employee_id
  AND b.leave_type_id = c.leave_type_id
  AND b.year = c.year
  AND ROUND(b.balance::numeric, 1) != ROUND(c.correct_balance::numeric, 1);