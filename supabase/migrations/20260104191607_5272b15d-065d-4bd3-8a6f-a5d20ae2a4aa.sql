-- Add status tracking columns to chat_messages
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'sent',
ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS read_at timestamp with time zone;

-- Create read receipts table for multi-recipient tracking
CREATE TABLE IF NOT EXISTS public.chat_message_read_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  read_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(message_id, employee_id)
);

-- Enable RLS on read receipts
ALTER TABLE public.chat_message_read_receipts ENABLE ROW LEVEL SECURITY;

-- RLS policies for read receipts
CREATE POLICY "Users can view read receipts in their org"
ON public.chat_message_read_receipts
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own read receipts"
ON public.chat_message_read_receipts
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
  )
  AND employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  )
);

-- Enable realtime for read receipts
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_read_receipts;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_chat_message_read_receipts_message_id ON public.chat_message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_status ON public.chat_messages(status);