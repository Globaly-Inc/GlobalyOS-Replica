
-- WhatsApp Flows table for interactive forms
CREATE TABLE public.wa_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  screens JSONB NOT NULL DEFAULT '[]'::jsonb,
  field_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  external_flow_id TEXT,
  submission_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view flows in their org"
  ON public.wa_flows FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert flows in their org"
  ON public.wa_flows FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can update flows in their org"
  ON public.wa_flows FOR UPDATE
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete flows in their org"
  ON public.wa_flows FOR DELETE
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

-- Flow submissions table
CREATE TABLE public.wa_flow_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  flow_id UUID NOT NULL REFERENCES public.wa_flows(id) ON DELETE CASCADE,
  wa_contact_id UUID REFERENCES public.wa_contacts(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.wa_conversations(id) ON DELETE SET NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  mapped_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_flow_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view submissions in their org"
  ON public.wa_flow_submissions FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert submissions in their org"
  ON public.wa_flow_submissions FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

-- Trigger to increment submission_count on wa_flows
CREATE OR REPLACE FUNCTION public.increment_flow_submission_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.wa_flows SET submission_count = submission_count + 1, updated_at = now() WHERE id = NEW.flow_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_increment_flow_submissions
  AFTER INSERT ON public.wa_flow_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_flow_submission_count();
