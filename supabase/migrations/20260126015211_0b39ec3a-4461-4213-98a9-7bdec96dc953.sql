-- Drop the legacy leave_types table
-- All functionality has been migrated to office_leave_types
-- Note: leave_type_offices was already dropped in a previous migration

DROP TABLE IF EXISTS public.leave_types CASCADE;