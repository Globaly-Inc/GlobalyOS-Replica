
-- Step 1: Change the type column from enum to TEXT
ALTER TABLE public.assignment_templates ALTER COLUMN type TYPE TEXT USING type::TEXT;

-- Step 2: Create assignment_type_options table
CREATE TABLE public.assignment_type_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, value)
);

-- Step 3: Enable RLS
ALTER TABLE public.assignment_type_options ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS policies using existing helper function pattern
CREATE POLICY "Users can view their org assignment type options"
  ON public.assignment_type_options FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert assignment type options for their org"
  ON public.assignment_type_options FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete assignment type options for their org"
  ON public.assignment_type_options FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  ));
