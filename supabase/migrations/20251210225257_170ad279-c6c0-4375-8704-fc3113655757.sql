-- Add min_days_advance to leave_types
ALTER TABLE public.leave_types 
ADD COLUMN min_days_advance integer NOT NULL DEFAULT 0;

-- Add half_day_type to leave_requests (full, first_half, second_half)
ALTER TABLE public.leave_requests 
ADD COLUMN half_day_type text NOT NULL DEFAULT 'full';

-- Add check constraint for half_day_type values
ALTER TABLE public.leave_requests 
ADD CONSTRAINT leave_requests_half_day_type_check 
CHECK (half_day_type IN ('full', 'first_half', 'second_half'));

-- Make reason required by setting NOT NULL (existing data is deleted)
ALTER TABLE public.leave_requests 
ALTER COLUMN reason SET NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.leave_requests.half_day_type IS 'Type of leave: full day, first half, or second half';
COMMENT ON COLUMN public.leave_types.min_days_advance IS 'Minimum days in advance required to request this leave type';