-- Drop the existing FK to auth.users and add FK to profiles
ALTER TABLE public.user_error_logs 
DROP CONSTRAINT IF EXISTS user_error_logs_user_id_fkey;

ALTER TABLE public.user_error_logs 
ADD CONSTRAINT user_error_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;