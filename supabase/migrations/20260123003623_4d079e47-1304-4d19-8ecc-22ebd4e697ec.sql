-- =============================================
-- Phase 1: Restructure Offices and Leave Management
-- =============================================

-- 1. Template Leave Types (super-admin managed, used for onboarding suggestions)
CREATE TABLE public.template_leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT, -- NULL = global, 'AU' = Australia-specific, etc.
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'paid', -- paid/unpaid
  description TEXT,
  default_days NUMERIC DEFAULT 0,
  min_days_advance INTEGER DEFAULT 0,
  max_negative_days NUMERIC DEFAULT 0,
  applies_to_gender TEXT DEFAULT 'all',
  applies_to_employment_types TEXT[],
  carry_forward_mode TEXT DEFAULT 'none', -- none, positive_only, negative_only, all
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Template Employment Types (super-admin managed)
CREATE TABLE public.template_employment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT, -- NULL = global
  name TEXT NOT NULL, -- snake_case internal name
  label TEXT NOT NULL, -- Display label
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Office-specific leave type configuration
CREATE TABLE public.office_leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'paid',
  description TEXT,
  default_days NUMERIC DEFAULT 0,
  min_days_advance INTEGER DEFAULT 0,
  max_negative_days NUMERIC DEFAULT 0,
  applies_to_gender TEXT DEFAULT 'all',
  applies_to_employment_types TEXT[],
  carry_forward_mode TEXT DEFAULT 'none',
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(office_id, name)
);

-- 4. Add leave settings columns to offices table
ALTER TABLE public.offices ADD COLUMN IF NOT EXISTS leave_year_start_month INTEGER DEFAULT 1;
ALTER TABLE public.offices ADD COLUMN IF NOT EXISTS leave_year_start_day INTEGER DEFAULT 1;
ALTER TABLE public.offices ADD COLUMN IF NOT EXISTS leave_enabled BOOLEAN DEFAULT true;

-- 5. Add office_leave_type reference to leave_type_balances for migration
ALTER TABLE public.leave_type_balances ADD COLUMN IF NOT EXISTS office_leave_type_id UUID REFERENCES public.office_leave_types(id) ON DELETE SET NULL;

-- 6. Enable RLS on new tables
ALTER TABLE public.template_leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_employment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_leave_types ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for template_leave_types (read-only for authenticated, full for super-admin)
CREATE POLICY "Anyone can view template leave types"
ON public.template_leave_types FOR SELECT
USING (true);

CREATE POLICY "Super admins can manage template leave types"
ON public.template_leave_types FOR ALL
USING (public.is_super_admin());

-- 8. RLS Policies for template_employment_types
CREATE POLICY "Anyone can view template employment types"
ON public.template_employment_types FOR SELECT
USING (true);

CREATE POLICY "Super admins can manage template employment types"
ON public.template_employment_types FOR ALL
USING (public.is_super_admin());

-- 9. RLS Policies for office_leave_types (org-scoped)
CREATE POLICY "Users can view office leave types in their org"
ON public.office_leave_types FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.employees
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Admins can manage office leave types"
ON public.office_leave_types FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    JOIN public.organization_members om ON om.user_id = e.user_id AND om.organization_id = e.organization_id
    WHERE e.user_id = auth.uid() 
    AND e.status = 'active'
    AND e.organization_id = office_leave_types.organization_id
    AND om.role IN ('owner', 'admin')
  )
);

-- 10. Seed global template leave types from existing defaults
INSERT INTO public.template_leave_types (country_code, name, category, description, default_days, min_days_advance, max_negative_days, applies_to_gender, applies_to_employment_types, carry_forward_mode, sort_order) VALUES
(NULL, 'Annual Leave', 'paid', 'Standard annual leave entitlement for rest and recreation', 20, 7, 0, 'all', ARRAY['employee'], 'positive_only', 1),
(NULL, 'Sick/Personal Leave', 'paid', 'Leave for personal illness or caring responsibilities', 10, 0, 0, 'all', ARRAY['employee', 'contract'], 'none', 2),
(NULL, 'Long Service Leave', 'paid', 'Extended leave after continuous years of service', 0, 30, 0, 'all', ARRAY['employee'], 'positive_only', 3),
(NULL, 'Substitute Leave', 'paid', 'Compensatory leave for working on holidays or weekends', 0, 1, 0, 'all', ARRAY['employee', 'contract'], 'positive_only', 4),
(NULL, 'Unpaid Leave', 'unpaid', 'Leave without pay for personal reasons', 0, 14, 0, 'all', ARRAY['employee', 'contract', 'trainee', 'intern'], 'none', 5),
-- Australia-specific
('AU', 'Annual Leave', 'paid', 'Standard annual leave entitlement (4 weeks per year)', 20, 7, 0, 'all', ARRAY['employee'], 'positive_only', 1),
('AU', 'Personal/Carer''s Leave', 'paid', 'Leave for personal illness or caring for family members', 10, 0, 0, 'all', ARRAY['employee'], 'positive_only', 2),
('AU', 'Compassionate Leave', 'paid', 'Leave for bereavement or serious illness of family member', 2, 0, 0, 'all', ARRAY['employee', 'contract'], 'none', 3),
('AU', 'Long Service Leave', 'paid', 'Extended leave after 10+ years of continuous service', 0, 30, 0, 'all', ARRAY['employee'], 'positive_only', 4),
('AU', 'Parental Leave', 'paid', 'Leave for birth or adoption of a child', 0, 30, 0, 'all', ARRAY['employee'], 'none', 5);

-- 11. Seed global template employment types
INSERT INTO public.template_employment_types (country_code, name, label, description, sort_order) VALUES
(NULL, 'employee', 'Full-time Employee', 'Permanent full-time staff member', 1),
(NULL, 'part_time', 'Part-time Employee', 'Permanent part-time staff member', 2),
(NULL, 'contract', 'Contractor', 'Fixed-term or project-based contractor', 3),
(NULL, 'trainee', 'Trainee', 'Employee in a formal training program', 4),
(NULL, 'intern', 'Intern', 'Short-term internship position', 5),
(NULL, 'casual', 'Casual', 'Casual or on-call employee', 6);

-- 12. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_office_leave_types_office ON public.office_leave_types(office_id);
CREATE INDEX IF NOT EXISTS idx_office_leave_types_org ON public.office_leave_types(organization_id);
CREATE INDEX IF NOT EXISTS idx_template_leave_types_country ON public.template_leave_types(country_code);
CREATE INDEX IF NOT EXISTS idx_template_employment_types_country ON public.template_employment_types(country_code);

-- 13. Add updated_at trigger for new tables
CREATE TRIGGER update_template_leave_types_updated_at
  BEFORE UPDATE ON public.template_leave_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_template_employment_types_updated_at
  BEFORE UPDATE ON public.template_employment_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_office_leave_types_updated_at
  BEFORE UPDATE ON public.office_leave_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();