-- Fix get_current_employee_id volatility for RLS compatibility
-- Changing from STABLE to VOLATILE ensures auth.uid() is freshly evaluated on each call
CREATE OR REPLACE FUNCTION public.get_current_employee_id()
 RETURNS uuid
 LANGUAGE sql
 VOLATILE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id FROM public.employees WHERE user_id = auth.uid() LIMIT 1
$function$;