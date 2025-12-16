-- Add effective_date column to leave_balance_logs
ALTER TABLE public.leave_balance_logs 
ADD COLUMN IF NOT EXISTS effective_date DATE DEFAULT CURRENT_DATE;

-- Update existing records to use created_at date as effective_date
UPDATE public.leave_balance_logs 
SET effective_date = DATE(created_at) 
WHERE effective_date IS NULL;