-- Create positions table for storing positions for future use
CREATE TABLE public.positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  department text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view positions" 
ON public.positions FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "HR and admins can manage positions" 
ON public.positions FOR ALL 
USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'));

-- Add new columns to employees table
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS street text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS postcode text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS id_number text,
ADD COLUMN IF NOT EXISTS tax_number text,
ADD COLUMN IF NOT EXISTS remuneration numeric,
ADD COLUMN IF NOT EXISTS remuneration_currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS emergency_contact_name text,
ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
ADD COLUMN IF NOT EXISTS emergency_contact_relationship text;