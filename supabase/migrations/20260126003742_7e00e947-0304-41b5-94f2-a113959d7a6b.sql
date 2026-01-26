-- Add unique constraint required for ON CONFLICT in sync_balance_from_log trigger
-- This allows the trigger to properly upsert balances using office_leave_type_id
ALTER TABLE public.leave_type_balances 
ADD CONSTRAINT leave_type_balances_employee_office_type_year_key 
UNIQUE (employee_id, office_leave_type_id, year);