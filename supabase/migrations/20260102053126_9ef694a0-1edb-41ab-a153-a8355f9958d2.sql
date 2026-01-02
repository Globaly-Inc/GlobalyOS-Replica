-- Add acknowledgment columns to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS requires_acknowledgment BOOLEAN DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS acknowledgment_deadline TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS last_ack_reminder_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS ack_reminder_count INTEGER DEFAULT 0;

-- Create post_acknowledgments table
CREATE TABLE IF NOT EXISTS public.post_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, employee_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_acknowledgments_post_id ON public.post_acknowledgments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_acknowledgments_employee_id ON public.post_acknowledgments(employee_id);
CREATE INDEX IF NOT EXISTS idx_post_acknowledgments_organization_id ON public.post_acknowledgments(organization_id);
CREATE INDEX IF NOT EXISTS idx_posts_requires_acknowledgment ON public.posts(requires_acknowledgment) WHERE requires_acknowledgment = true;
CREATE INDEX IF NOT EXISTS idx_posts_acknowledgment_deadline ON public.posts(acknowledgment_deadline) WHERE acknowledgment_deadline IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.post_acknowledgments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view acknowledgments in their organization
CREATE POLICY "Users can view acknowledgments in their org"
  ON public.post_acknowledgments
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert their own acknowledgments
CREATE POLICY "Users can insert their own acknowledgments"
  ON public.post_acknowledgments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = (SELECT id FROM public.employees WHERE user_id = auth.uid() LIMIT 1)
    AND organization_id = (SELECT organization_id FROM public.employees WHERE user_id = auth.uid() LIMIT 1)
  );

-- RLS Policy: Users can delete their own acknowledgments (if needed)
CREATE POLICY "Users can delete their own acknowledgments"
  ON public.post_acknowledgments
  FOR DELETE
  TO authenticated
  USING (
    employee_id = (SELECT id FROM public.employees WHERE user_id = auth.uid() LIMIT 1)
  );

-- Enable realtime for post_acknowledgments
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_acknowledgments;

-- Add notification types for acknowledgments (update check constraint if exists)
DO $$
BEGIN
  -- Update notifications type check if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'notifications_type_check' 
    AND conrelid = 'public.notifications'::regclass
  ) THEN
    ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;