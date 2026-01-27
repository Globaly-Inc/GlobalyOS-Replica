-- Organization payment methods (Stripe references)
CREATE TABLE public.organization_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_method_id TEXT NOT NULL,
  card_brand TEXT,
  card_last4 TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organization_payment_methods ENABLE ROW LEVEL SECURITY;

-- Policies for payment methods (only org owners/admins can manage)
CREATE POLICY "Org owners and admins can view payment methods"
ON public.organization_payment_methods
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_payment_methods.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Org owners can insert payment methods"
ON public.organization_payment_methods
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_payment_methods.organization_id
    AND om.user_id = auth.uid()
    AND om.role = 'owner'
  )
);

CREATE POLICY "Org owners can update payment methods"
ON public.organization_payment_methods
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_payment_methods.organization_id
    AND om.user_id = auth.uid()
    AND om.role = 'owner'
  )
);

CREATE POLICY "Org owners can delete payment methods"
ON public.organization_payment_methods
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_payment_methods.organization_id
    AND om.user_id = auth.uid()
    AND om.role = 'owner'
  )
);

-- Billing contacts table
CREATE TABLE public.billing_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.billing_contacts ENABLE ROW LEVEL SECURITY;

-- Policies for billing contacts
CREATE POLICY "Org owners and admins can view billing contacts"
ON public.billing_contacts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = billing_contacts.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Org owners can manage billing contacts"
ON public.billing_contacts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = billing_contacts.organization_id
    AND om.user_id = auth.uid()
    AND om.role = 'owner'
  )
);

-- Credit notes for refunds/adjustments
CREATE TABLE public.credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  reason TEXT,
  status TEXT DEFAULT 'issued' CHECK (status IN ('issued', 'applied', 'voided')),
  stripe_credit_note_id TEXT,
  applied_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;

-- Policies for credit notes
CREATE POLICY "Org owners and admins can view credit notes"
ON public.credit_notes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = credit_notes.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
  )
);

-- Only super admins can create credit notes (via edge function with service role)

-- Create indexes for performance
CREATE INDEX idx_org_payment_methods_org ON public.organization_payment_methods(organization_id);
CREATE INDEX idx_billing_contacts_org ON public.billing_contacts(organization_id);
CREATE INDEX idx_credit_notes_org ON public.credit_notes(organization_id);
CREATE INDEX idx_credit_notes_invoice ON public.credit_notes(invoice_id);

-- Add trigger for updated_at
CREATE TRIGGER update_organization_payment_methods_updated_at
BEFORE UPDATE ON public.organization_payment_methods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_billing_contacts_updated_at
BEFORE UPDATE ON public.billing_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_credit_notes_updated_at
BEFORE UPDATE ON public.credit_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();