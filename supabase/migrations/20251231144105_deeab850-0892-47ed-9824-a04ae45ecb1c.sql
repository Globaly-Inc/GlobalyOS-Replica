-- Call sessions table
CREATE TABLE public.call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  space_id uuid REFERENCES public.chat_spaces(id) ON DELETE CASCADE,
  call_type text NOT NULL CHECK (call_type IN ('audio', 'video')),
  status text NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'active', 'ended', 'missed', 'declined')),
  initiated_by uuid NOT NULL REFERENCES public.employees(id),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT call_session_target CHECK (
    (conversation_id IS NOT NULL AND space_id IS NULL) OR 
    (conversation_id IS NULL AND space_id IS NOT NULL)
  )
);

-- Call participants table
CREATE TABLE public.call_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES public.call_sessions(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'joined', 'left', 'declined', 'missed')),
  joined_at timestamptz,
  left_at timestamptz,
  is_muted boolean DEFAULT false,
  is_video_off boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(call_id, employee_id)
);

-- Call signaling table for WebRTC
CREATE TABLE public.call_signaling (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES public.call_sessions(id) ON DELETE CASCADE,
  from_employee_id uuid NOT NULL REFERENCES public.employees(id),
  to_employee_id uuid NOT NULL REFERENCES public.employees(id),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  signal_type text NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice-candidate')),
  signal_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_call_sessions_org ON public.call_sessions(organization_id);
CREATE INDEX idx_call_sessions_conversation ON public.call_sessions(conversation_id);
CREATE INDEX idx_call_sessions_space ON public.call_sessions(space_id);
CREATE INDEX idx_call_sessions_status ON public.call_sessions(status);
CREATE INDEX idx_call_participants_call ON public.call_participants(call_id);
CREATE INDEX idx_call_participants_employee ON public.call_participants(employee_id);
CREATE INDEX idx_call_signaling_call ON public.call_signaling(call_id);
CREATE INDEX idx_call_signaling_to ON public.call_signaling(to_employee_id);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signaling;

-- Enable RLS
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_signaling ENABLE ROW LEVEL SECURITY;

-- RLS Policies for call_sessions
CREATE POLICY "Users can view calls in their org" ON public.call_sessions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create calls in their org" ON public.call_sessions
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update calls in their org" ON public.call_sessions
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for call_participants
CREATE POLICY "Users can view call participants in their org" ON public.call_participants
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create call participants in their org" ON public.call_participants
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own participant status" ON public.call_participants
  FOR UPDATE USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for call_signaling
CREATE POLICY "Users can view signaling for their calls" ON public.call_signaling
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create signaling in their org" ON public.call_signaling
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their signaling" ON public.call_signaling
  FOR DELETE USING (
    from_employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
  );