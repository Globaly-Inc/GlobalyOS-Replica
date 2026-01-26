-- Create table for personal message stars
CREATE TABLE public.chat_message_stars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(employee_id, message_id)
);

-- Enable RLS
ALTER TABLE public.chat_message_stars ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own stars
CREATE POLICY "Users can view their own message stars"
  ON public.chat_message_stars
  FOR SELECT
  TO authenticated
  USING (employee_id = get_current_employee_id());

-- Policy: Users can add their own stars
CREATE POLICY "Users can add their own message stars"
  ON public.chat_message_stars
  FOR INSERT
  TO authenticated
  WITH CHECK (employee_id = get_current_employee_id());

-- Policy: Users can remove their own stars
CREATE POLICY "Users can delete their own message stars"
  ON public.chat_message_stars
  FOR DELETE
  TO authenticated
  USING (employee_id = get_current_employee_id());

-- Create index for faster lookups
CREATE INDEX idx_chat_message_stars_employee ON public.chat_message_stars(employee_id);
CREATE INDEX idx_chat_message_stars_message ON public.chat_message_stars(message_id);