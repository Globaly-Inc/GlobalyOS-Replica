-- Drop the outdated leave_type check constraint since we now use custom leave types
ALTER TABLE public.leave_requests DROP CONSTRAINT IF EXISTS leave_requests_leave_type_check;