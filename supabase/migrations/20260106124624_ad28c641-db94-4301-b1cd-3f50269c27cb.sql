-- Update all existing 'user' roles to 'member'
UPDATE public.user_roles SET role = 'member' WHERE role = 'user';