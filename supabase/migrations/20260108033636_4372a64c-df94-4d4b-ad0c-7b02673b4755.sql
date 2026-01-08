-- Clean up orphaned balance records that have no corresponding logs
-- Option A: For records with 0 balance and no logs, delete them
DELETE FROM leave_type_balances ltb
WHERE ltb.year = 2026
AND NOT EXISTS (
  SELECT 1 FROM leave_balance_logs lbl
  WHERE lbl.employee_id = ltb.employee_id
  AND lbl.leave_type_id = ltb.leave_type_id
  AND lbl.year = 2026
  AND lbl.action IN ('year_allocation', 'year_init', 'carry_forward_in', 'manual_adjustment', 'leave_deduct')
);

-- Option B: For any remaining orphan balances (non-zero without logs), create backfill logs
INSERT INTO leave_balance_logs (
  employee_id, leave_type_id, organization_id, 
  leave_type, change_amount, previous_balance, new_balance,
  action, year, reason, effective_date, created_by
)
SELECT 
  ltb.employee_id, ltb.leave_type_id, ltb.organization_id,
  lt.name, ltb.balance, 0, ltb.balance,
  'year_init', ltb.year, 
  'System backfill for untracked balance',
  CONCAT(ltb.year, '-01-01')::date,
  ltb.employee_id
FROM leave_type_balances ltb
JOIN leave_types lt ON lt.id = ltb.leave_type_id
WHERE ltb.year = 2026
AND ltb.balance != 0
AND NOT EXISTS (
  SELECT 1 FROM leave_balance_logs lbl
  WHERE lbl.employee_id = ltb.employee_id
  AND lbl.leave_type_id = ltb.leave_type_id
  AND lbl.year = 2026
  AND lbl.action IN ('year_allocation', 'year_init', 'carry_forward_in', 'manual_adjustment', 'leave_deduct')
);