-- Fix Laxmi's missing carry-forward from 2025 to 2026
-- Laxmi has 36 days Annual Leave in 2025 that was not carried forward

-- Step 1: Add carry_forward_out log for 2025 (deduct 36 from 2025)
INSERT INTO leave_balance_logs (
  employee_id, organization_id, leave_type, leave_type_id,
  change_amount, previous_balance, new_balance,
  reason, created_by, effective_date, action, year
) VALUES (
  'b14f8c5d-05a1-4e7d-83dd-52cd0a7f1470',
  '11111111-1111-1111-1111-111111111111',
  'Annual Leave',
  '4afca5e6-0713-4841-b538-9ea870bdc33c',
  -36,
  36,
  0,
  'Carried forward to 2026',
  '708b136a-4f5e-42b9-85f5-a95c3e6d55c4',
  '2026-01-01',
  'carry_forward_out',
  2025
);

-- Step 2: Add carry_forward_in log for 2026 (add 36 to 2026)
INSERT INTO leave_balance_logs (
  employee_id, organization_id, leave_type, leave_type_id,
  change_amount, previous_balance, new_balance,
  reason, created_by, effective_date, action, year
) VALUES (
  'b14f8c5d-05a1-4e7d-83dd-52cd0a7f1470',
  '11111111-1111-1111-1111-111111111111',
  'Annual Leave',
  '4afca5e6-0713-4841-b538-9ea870bdc33c',
  36,
  12,
  48,
  'Carried from 2025',
  '708b136a-4f5e-42b9-85f5-a95c3e6d55c4',
  '2026-01-01',
  'carry_forward_in',
  2026
);