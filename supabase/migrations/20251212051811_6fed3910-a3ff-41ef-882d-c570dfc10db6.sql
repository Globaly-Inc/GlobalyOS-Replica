-- Enable security_invoker on attendance_summary view
-- This makes the view respect RLS policies of the underlying attendance_records table
-- which already has proper policies for user/manager/HR/admin access
ALTER VIEW public.attendance_summary SET (security_invoker = on);