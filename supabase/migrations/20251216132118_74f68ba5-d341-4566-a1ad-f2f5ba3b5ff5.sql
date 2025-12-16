-- Add audit trail columns to leave_balance_logs
ALTER TABLE public.leave_balance_logs 
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.employees(id),
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;

-- Add updated_by column to leave_requests (updated_at already exists as reviewed_at can serve similar purpose)
ALTER TABLE public.leave_requests 
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.employees(id),
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;