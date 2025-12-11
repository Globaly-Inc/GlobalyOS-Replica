-- Revoke direct execute permissions on sensitive helper functions from public
-- These functions are designed for RLS policy evaluation, not direct user calls

-- Revoke from anon and authenticated roles
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_org_owner(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_organizations(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_otps() FROM anon, authenticated;

-- Grant back to service_role only (for edge functions and admin operations)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_org_owner(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_organizations(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_otps() TO service_role;

-- Note: SECURITY DEFINER functions in RLS policies will still work because
-- RLS policy evaluation happens at the database level, not as direct function calls