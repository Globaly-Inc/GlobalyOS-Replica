-- Fix RLS issue: Change can_insert_post from STABLE to VOLATILE
-- This ensures auth.uid() is freshly evaluated on each call

CREATE OR REPLACE FUNCTION public.can_insert_post(
  _employee_id uuid,
  _organization_id uuid,
  _post_type text
)
RETURNS boolean
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = _employee_id
      AND e.organization_id = _organization_id
      AND e.user_id = auth.uid()
      AND e.status = 'active'
      AND (
        _post_type IN ('win', 'kudos', 'social')
        OR (_post_type = 'announcement' AND (
          has_role(auth.uid(), 'owner'::app_role) OR 
          has_role(auth.uid(), 'admin'::app_role) OR 
          has_role(auth.uid(), 'hr'::app_role)
        ))
        OR (_post_type = 'executive_message' AND (
          has_role(auth.uid(), 'owner'::app_role) OR 
          has_role(auth.uid(), 'admin'::app_role)
        ))
      )
  )
$$;