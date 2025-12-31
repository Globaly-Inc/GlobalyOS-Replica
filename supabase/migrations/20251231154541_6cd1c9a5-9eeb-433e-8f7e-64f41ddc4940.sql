-- Add call recording support

-- Table for call recordings
CREATE TABLE IF NOT EXISTS public.call_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES public.call_sessions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recorded_by UUID NOT NULL REFERENCES public.employees(id),
  storage_path TEXT NOT NULL,
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  status TEXT NOT NULL DEFAULT 'recording' CHECK (status IN ('recording', 'processing', 'ready', 'failed')),
  consent_given_by UUID[] DEFAULT '{}',
  transcript TEXT,
  ai_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_recordings ENABLE ROW LEVEL SECURITY;

-- RLS policies for call_recordings
CREATE POLICY "Users can view call recordings for their org"
  ON public.call_recordings FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.employees 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert call recordings for their org"
  ON public.call_recordings FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.employees 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own call recordings"
  ON public.call_recordings FOR UPDATE
  USING (
    recorded_by IN (
      SELECT id FROM public.employees 
      WHERE user_id = auth.uid()
    )
  );

-- Add columns to call_sessions for metadata
ALTER TABLE public.call_sessions 
ADD COLUMN IF NOT EXISTS recording_id UUID REFERENCES public.call_recordings(id),
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

-- Enable realtime for call_recordings
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_recordings;

-- Create trigger for updated_at
CREATE TRIGGER update_call_recordings_updated_at
  BEFORE UPDATE ON public.call_recordings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_call_recordings_call_id ON public.call_recordings(call_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_org_id ON public.call_recordings(organization_id);