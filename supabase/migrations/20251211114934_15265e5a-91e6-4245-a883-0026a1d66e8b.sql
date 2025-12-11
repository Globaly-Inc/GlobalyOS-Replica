-- Drop existing admin policy on offices
DROP POLICY IF EXISTS "Admins can manage offices" ON public.offices;

-- Create organization-scoped policy for admins managing offices
CREATE POLICY "Admins can manage offices in their organization"
ON public.offices FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND is_org_member(auth.uid(), organization_id)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND is_org_member(auth.uid(), organization_id)
);

-- Add HR policy for managing offices in their organization
CREATE POLICY "HR can manage offices in their organization"
ON public.offices FOR ALL
USING (
  has_role(auth.uid(), 'hr'::app_role) 
  AND is_org_member(auth.uid(), organization_id)
)
WITH CHECK (
  has_role(auth.uid(), 'hr'::app_role) 
  AND is_org_member(auth.uid(), organization_id)
);