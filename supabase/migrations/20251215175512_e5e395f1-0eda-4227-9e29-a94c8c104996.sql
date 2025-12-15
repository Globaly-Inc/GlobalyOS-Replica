-- Recreate employee_directory view with SECURITY DEFINER to allow all org members to see directory
-- The view already has is_org_member check, so it's safe

DROP VIEW IF EXISTS public.employee_directory;

CREATE OR REPLACE VIEW public.employee_directory
WITH (security_invoker = false)
AS
SELECT 
    e.id,
    e.user_id,
    e.organization_id,
    e.position,
    e.department,
    e.office_id,
    e.manager_id,
    e.join_date,
    e.status,
    e.superpowers,
    e.created_at,
    e.updated_at,
    p.full_name,
    p.email,
    p.avatar_url,
    o.name AS office_name,
    e.city,
    e.country
FROM employees e
LEFT JOIN profiles p ON p.id = e.user_id
LEFT JOIN offices o ON o.id = e.office_id
WHERE is_org_member(auth.uid(), e.organization_id);

-- Grant select to authenticated users
GRANT SELECT ON public.employee_directory TO authenticated;

COMMENT ON VIEW public.employee_directory IS 'Non-sensitive employee directory accessible to all org members. Uses security_invoker=false to bypass employees RLS while maintaining org isolation via is_org_member check.';