-- Create junction table for space departments
CREATE TABLE IF NOT EXISTS public.chat_space_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.chat_spaces(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(space_id, department_id)
);

-- Enable RLS
ALTER TABLE public.chat_space_departments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view department links for spaces in their organization
CREATE POLICY "Users can view department links for their org spaces"
  ON public.chat_space_departments FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.employees 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Policy: Space admins or org admins can manage department links
CREATE POLICY "Space admins can manage department links"
  ON public.chat_space_departments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_space_members csm
      WHERE csm.space_id = chat_space_departments.space_id
        AND csm.employee_id = (
          SELECT id FROM public.employees WHERE user_id = auth.uid() AND status = 'active'
        )
        AND csm.role = 'admin'
    )
    OR public.is_org_admin_or_owner(
      organization_id,
      (SELECT id FROM public.employees WHERE user_id = auth.uid() AND status = 'active')
    )
  );

CREATE POLICY "Space admins can delete department links"
  ON public.chat_space_departments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_space_members csm
      WHERE csm.space_id = chat_space_departments.space_id
        AND csm.employee_id = (
          SELECT id FROM public.employees WHERE user_id = auth.uid() AND status = 'active'
        )
        AND csm.role = 'admin'
    )
    OR public.is_org_admin_or_owner(
      organization_id,
      (SELECT id FROM public.employees WHERE user_id = auth.uid() AND status = 'active')
    )
  );