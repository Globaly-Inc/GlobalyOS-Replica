-- Create table for country-specific leave type defaults
CREATE TABLE public.template_leave_type_country_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_leave_type_id UUID NOT NULL 
    REFERENCES public.template_leave_types(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  default_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(template_leave_type_id, country_code)
);

-- Enable Row Level Security
ALTER TABLE public.template_leave_type_country_defaults ENABLE ROW LEVEL SECURITY;

-- Read access for authenticated users (needed for onboarding)
CREATE POLICY "Anyone can view template country defaults"
ON public.template_leave_type_country_defaults FOR SELECT
USING (true);

-- Full access for super admins
CREATE POLICY "Super admins can manage template country defaults"
ON public.template_leave_type_country_defaults FOR ALL 
USING (public.is_super_admin());

-- Index for lookups by template leave type
CREATE INDEX idx_template_country_defaults_type 
ON public.template_leave_type_country_defaults(template_leave_type_id);

-- Index for lookups by country code
CREATE INDEX idx_template_country_defaults_country 
ON public.template_leave_type_country_defaults(country_code);

-- Updated at trigger
CREATE TRIGGER update_template_country_defaults_updated_at
  BEFORE UPDATE ON public.template_leave_type_country_defaults
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();