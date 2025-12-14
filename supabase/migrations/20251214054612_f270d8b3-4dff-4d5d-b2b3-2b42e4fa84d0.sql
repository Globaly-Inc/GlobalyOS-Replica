-- Create welcome_survey_responses table for JTBD data
CREATE TABLE IF NOT EXISTS public.welcome_survey_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  primary_goal TEXT,
  team_size TEXT,
  priority_features TEXT[] DEFAULT '{}',
  how_heard_about_us TEXT,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Enable RLS
ALTER TABLE public.welcome_survey_responses ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own survey responses" ON public.welcome_survey_responses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own survey responses" ON public.welcome_survey_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own survey responses" ON public.welcome_survey_responses
  FOR UPDATE USING (auth.uid() = user_id);

-- Add checklist_items column to onboarding_progress for detailed tracking
ALTER TABLE public.onboarding_progress 
ADD COLUMN IF NOT EXISTS checklist_items JSONB DEFAULT '{}'::jsonb;

-- Add survey_completed column
ALTER TABLE public.onboarding_progress 
ADD COLUMN IF NOT EXISTS survey_completed BOOLEAN DEFAULT false;