
-- Create crm_companies table
CREATE TABLE public.crm_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  industry text,
  website text,
  phone text,
  email text,
  address_street text,
  address_city text,
  address_state text,
  address_postcode text,
  address_country text,
  logo_url text,
  notes text,
  rating text,
  source text,
  created_by uuid REFERENCES public.employees(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create crm_contacts table
CREATE TABLE public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text,
  email text,
  phone text,
  job_title text,
  avatar_url text,
  address_street text,
  address_city text,
  address_state text,
  address_postcode text,
  address_country text,
  notes text,
  rating text,
  source text,
  is_archived boolean NOT NULL DEFAULT false,
  tags text[],
  date_of_birth date,
  created_by uuid REFERENCES public.employees(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create crm_activity_log table
CREATE TABLE public.crm_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.crm_companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  type text NOT NULL,
  content text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_crm_companies_org ON public.crm_companies(organization_id);
CREATE INDEX idx_crm_contacts_org ON public.crm_contacts(organization_id);
CREATE INDEX idx_crm_contacts_company ON public.crm_contacts(company_id);
CREATE INDEX idx_crm_activity_org ON public.crm_activity_log(organization_id);
CREATE INDEX idx_crm_activity_contact ON public.crm_activity_log(contact_id);
CREATE INDEX idx_crm_activity_company ON public.crm_activity_log(company_id);

-- Enable RLS
ALTER TABLE public.crm_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS helper function
CREATE OR REPLACE FUNCTION public.get_user_crm_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.employees WHERE user_id = auth.uid() LIMIT 1
$$;

-- crm_companies policies
CREATE POLICY "crm_companies_select" ON public.crm_companies FOR SELECT TO authenticated
  USING (organization_id = public.get_user_crm_org_id());
CREATE POLICY "crm_companies_insert" ON public.crm_companies FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_crm_org_id());
CREATE POLICY "crm_companies_update" ON public.crm_companies FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_crm_org_id());
CREATE POLICY "crm_companies_delete" ON public.crm_companies FOR DELETE TO authenticated
  USING (organization_id = public.get_user_crm_org_id());

-- crm_contacts policies
CREATE POLICY "crm_contacts_select" ON public.crm_contacts FOR SELECT TO authenticated
  USING (organization_id = public.get_user_crm_org_id());
CREATE POLICY "crm_contacts_insert" ON public.crm_contacts FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_crm_org_id());
CREATE POLICY "crm_contacts_update" ON public.crm_contacts FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_crm_org_id());
CREATE POLICY "crm_contacts_delete" ON public.crm_contacts FOR DELETE TO authenticated
  USING (organization_id = public.get_user_crm_org_id());

-- crm_activity_log policies
CREATE POLICY "crm_activity_select" ON public.crm_activity_log FOR SELECT TO authenticated
  USING (organization_id = public.get_user_crm_org_id());
CREATE POLICY "crm_activity_insert" ON public.crm_activity_log FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_crm_org_id());
CREATE POLICY "crm_activity_update" ON public.crm_activity_log FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_crm_org_id());
CREATE POLICY "crm_activity_delete" ON public.crm_activity_log FOR DELETE TO authenticated
  USING (organization_id = public.get_user_crm_org_id());

-- Updated_at triggers
CREATE TRIGGER update_crm_companies_updated_at
  BEFORE UPDATE ON public.crm_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_contacts_updated_at
  BEFORE UPDATE ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
