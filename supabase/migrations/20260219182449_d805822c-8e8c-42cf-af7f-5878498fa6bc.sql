
-- Saved replies / snippets for WhatsApp inbox
CREATE TABLE public.wa_saved_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  shortcut TEXT,
  category TEXT DEFAULT 'general',
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_saved_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view saved replies in their org"
  ON public.wa_saved_replies FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert saved replies in their org"
  ON public.wa_saved_replies FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can update saved replies in their org"
  ON public.wa_saved_replies FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete saved replies in their org"
  ON public.wa_saved_replies FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

-- Sequence campaigns (drip)
CREATE TABLE public.wa_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  audience_source TEXT DEFAULT 'all',
  audience_filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  stop_conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  stats JSONB NOT NULL DEFAULT '{"enrolled": 0, "completed": 0, "stopped": 0}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sequences in their org"
  ON public.wa_sequences FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert sequences in their org"
  ON public.wa_sequences FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can update sequences in their org"
  ON public.wa_sequences FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete sequences in their org"
  ON public.wa_sequences FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

-- Add SLA columns to wa_conversations
ALTER TABLE public.wa_conversations
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_first_response_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS sla_resolution_minutes INTEGER;

-- Add auto_assign_mode to wa_accounts
ALTER TABLE public.wa_accounts
  ADD COLUMN IF NOT EXISTS auto_assign_mode TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS sla_first_response_target INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS sla_resolution_target INTEGER DEFAULT 240;
