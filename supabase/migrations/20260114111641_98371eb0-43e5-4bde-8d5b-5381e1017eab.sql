-- Convert is_space_member to PL/pgSQL to prevent function inlining that causes recursion
CREATE OR REPLACE FUNCTION public.is_space_member(_space_id uuid, _employee_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.chat_space_members csm
    WHERE csm.space_id = _space_id
      AND csm.employee_id = _employee_id
  );
END;
$$;

-- Convert is_space_admin to PL/pgSQL to prevent function inlining that causes recursion
CREATE OR REPLACE FUNCTION public.is_space_admin(_space_id uuid, _employee_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.chat_space_members csm
    WHERE csm.space_id = _space_id
      AND csm.employee_id = _employee_id
      AND csm.role = 'admin'
  );
END;
$$;

-- Tighten function execute privileges to authenticated users only
REVOKE ALL ON FUNCTION public.is_space_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_space_admin(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_space_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_space_admin(uuid, uuid) TO authenticated;