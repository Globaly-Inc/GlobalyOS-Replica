-- Fix legal_entities RLS: Add owner and HR roles
DROP POLICY IF EXISTS "Admins can manage legal entities" ON legal_entities;
DROP POLICY IF EXISTS "Owners, admins, and HR can manage legal entities" ON legal_entities;

CREATE POLICY "Owners, admins, and HR can manage legal entities" ON legal_entities
  FOR ALL USING (
    (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr'))
    AND is_org_member(auth.uid(), organization_id)
  );

-- Fix salary_components RLS: Add owner role
DROP POLICY IF EXISTS "HR and admins can manage salary components" ON salary_components;
DROP POLICY IF EXISTS "Owners, HR, and admins can manage salary components" ON salary_components;

CREATE POLICY "Owners, HR, and admins can manage salary components" ON salary_components
  FOR ALL USING (
    (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr'))
    AND is_org_member(auth.uid(), organization_id)
  );