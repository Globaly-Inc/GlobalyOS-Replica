-- Phase 1: Seed template leave types and fix schema

-- 1. Seed template_leave_types with global and country-specific defaults
INSERT INTO public.template_leave_types (name, category, description, default_days, min_days_advance, max_negative_days, applies_to_gender, applies_to_employment_types, carry_forward_mode, is_active, country_code) VALUES
-- Global leave types (no country_code)
('Annual Leave', 'paid', 'Standard annual leave entitlement', 20, 7, 5, 'all', ARRAY['employee', 'contract']::text[], 'positive_only', true, NULL),
('Sick Leave', 'paid', 'Medical sick leave', 10, 0, 0, 'all', NULL, 'none', true, NULL),
('Parental Leave', 'paid', 'Leave for new parents', 10, 14, 0, 'all', ARRAY['employee']::text[], 'none', true, NULL),
('Bereavement Leave', 'paid', 'Leave for family bereavement', 5, 0, 0, 'all', NULL, 'none', true, NULL),
('Unpaid Leave', 'unpaid', 'Leave without pay', 0, 7, 0, 'all', NULL, 'none', true, NULL),
-- Australia specific
('Personal Leave', 'paid', 'Personal/carer''s leave (Australian NES)', 10, 0, 0, 'all', ARRAY['employee']::text[], 'positive_only', true, 'AU'),
('Long Service Leave', 'paid', 'Long service leave after qualifying period', 0, 30, 0, 'all', ARRAY['employee']::text[], 'all', true, 'AU'),
('Compassionate Leave', 'paid', 'Compassionate leave (Australian NES)', 2, 0, 0, 'all', NULL, 'none', true, 'AU'),
-- United States specific  
('FMLA Leave', 'unpaid', 'Family and Medical Leave Act leave', 60, 30, 0, 'all', ARRAY['employee']::text[], 'none', true, 'US'),
('Jury Duty', 'paid', 'Leave for jury service', 5, 0, 0, 'all', NULL, 'none', true, 'US'),
('Voting Leave', 'paid', 'Leave to vote in elections', 0.5, 0, 0, 'all', NULL, 'none', true, 'US'),
-- United Kingdom specific
('Maternity Leave', 'paid', 'Statutory maternity leave', 52, 28, 0, 'female', ARRAY['employee']::text[], 'none', true, 'GB'),
('Paternity Leave', 'paid', 'Statutory paternity leave', 2, 28, 0, 'male', ARRAY['employee']::text[], 'none', true, 'GB'),
('Shared Parental Leave', 'paid', 'Shared parental leave', 50, 28, 0, 'all', ARRAY['employee']::text[], 'none', true, 'GB')
ON CONFLICT DO NOTHING;

-- 2. Seed template_employment_types with global defaults (using correct columns: name, label, description)
INSERT INTO public.template_employment_types (name, label, description, is_active, country_code) VALUES
('employee', 'Employee', 'Full-time or part-time permanent employee', true, NULL),
('contract', 'Contract', 'Fixed-term contract worker', true, NULL),
('intern', 'Intern', 'Paid or unpaid intern', true, NULL),
('trainee', 'Trainee', 'Employee in training program', true, NULL),
-- Australia specific
('casual', 'Casual', 'Casual employee without guaranteed hours', true, 'AU'),
-- United States specific
('exempt', 'Exempt', 'Salaried exempt employee', true, 'US'),
('non_exempt', 'Non-Exempt', 'Hourly non-exempt employee', true, 'US')
ON CONFLICT DO NOTHING;

-- 3. Add office_id column to leave_requests for tracking which office's leave type was used
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'leave_requests' 
    AND column_name = 'office_id'
  ) THEN
    ALTER TABLE public.leave_requests 
    ADD COLUMN office_id UUID REFERENCES public.offices(id);
  END IF;
END $$;

-- 4. Add leave_type_id column to leave_requests to reference the specific office leave type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'leave_requests' 
    AND column_name = 'leave_type_id'
  ) THEN
    ALTER TABLE public.leave_requests 
    ADD COLUMN leave_type_id UUID REFERENCES public.office_leave_types(id);
  END IF;
END $$;

-- 5. Create index on office_leave_types for efficient queries
CREATE INDEX IF NOT EXISTS idx_office_leave_types_office_active 
ON public.office_leave_types(office_id, is_active);

CREATE INDEX IF NOT EXISTS idx_office_leave_types_org 
ON public.office_leave_types(organization_id);

-- 6. Add office_leave_type_id to leave_type_balances if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'leave_type_balances' 
    AND column_name = 'office_leave_type_id'
  ) THEN
    ALTER TABLE public.leave_type_balances 
    ADD COLUMN office_leave_type_id UUID REFERENCES public.office_leave_types(id);
  END IF;
END $$;

-- 7. Create index on leave_requests for office-based filtering
CREATE INDEX IF NOT EXISTS idx_leave_requests_office 
ON public.leave_requests(office_id);

CREATE INDEX IF NOT EXISTS idx_leave_requests_leave_type_id 
ON public.leave_requests(leave_type_id);

-- 8. Create index on leave_type_balances for office leave type lookups
CREATE INDEX IF NOT EXISTS idx_leave_type_balances_office_leave_type 
ON public.leave_type_balances(office_leave_type_id);