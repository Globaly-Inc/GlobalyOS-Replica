-- Add timezone_setup_completed column
ALTER TABLE public.employee_onboarding_data
ADD COLUMN timezone_setup_completed BOOLEAN DEFAULT FALSE;

-- Add guides_viewed column for tracking guide completion
ALTER TABLE public.employee_onboarding_data
ADD COLUMN guides_viewed JSONB DEFAULT '{}';

COMMENT ON COLUMN public.employee_onboarding_data.timezone_setup_completed
IS 'Whether the employee has completed timezone setup';

COMMENT ON COLUMN public.employee_onboarding_data.guides_viewed
IS 'JSON object tracking which onboarding guides have been viewed';