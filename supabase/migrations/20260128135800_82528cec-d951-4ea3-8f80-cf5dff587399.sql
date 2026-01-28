-- Fix search_path for all SECURITY DEFINER functions to prevent search path injection attacks

-- Activity logging functions
ALTER FUNCTION public.log_attendance_activity() SET search_path = public;
ALTER FUNCTION public.log_chat_activity() SET search_path = public;
ALTER FUNCTION public.log_kpi_activity() SET search_path = public;
ALTER FUNCTION public.log_kudos_activity() SET search_path = public;
ALTER FUNCTION public.log_leave_activity() SET search_path = public;
ALTER FUNCTION public.log_update_activity() SET search_path = public;
ALTER FUNCTION public.log_wiki_activity() SET search_path = public;

-- Chat/messaging functions
ALTER FUNCTION public.get_last_messages_batch(uuid[]) SET search_path = public;
ALTER FUNCTION public.update_conversation_last_message() SET search_path = public;

-- Space sync functions (recently created)
ALTER FUNCTION public.sync_company_space_members() SET search_path = public;
ALTER FUNCTION public.sync_department_space_members() SET search_path = public;
ALTER FUNCTION public.sync_office_space_members() SET search_path = public;
ALTER FUNCTION public.sync_project_space_members() SET search_path = public;

-- Onboarding sync function
ALTER FUNCTION public.sync_onboarding_personal_info() SET search_path = public;