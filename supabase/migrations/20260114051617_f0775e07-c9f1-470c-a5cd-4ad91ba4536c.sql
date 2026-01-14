-- Fix doubled leave balances by recalculating from leave_balance_logs
-- This resolves the race condition where balances were set directly AND trigger added same amount

WITH calculated_balances AS (
  SELECT 
    l.employee_id,
    l.leave_type_id,
    l.year,
    SUM(l.change_amount) as correct_balance
  FROM leave_balance_logs l
  WHERE l.leave_type_id IS NOT NULL
  GROUP BY l.employee_id, l.leave_type_id, l.year
)
UPDATE leave_type_balances b
SET 
  balance = c.correct_balance,
  updated_at = now()
FROM calculated_balances c
WHERE b.employee_id = c.employee_id
  AND b.leave_type_id = c.leave_type_id
  AND b.year = c.year
  AND b.balance != c.correct_balance;