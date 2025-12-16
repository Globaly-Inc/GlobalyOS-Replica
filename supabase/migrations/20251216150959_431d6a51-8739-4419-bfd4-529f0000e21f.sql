-- Add self-assessment and acknowledgment columns to performance_reviews
ALTER TABLE public.performance_reviews 
ADD COLUMN IF NOT EXISTS self_what_went_well TEXT,
ADD COLUMN IF NOT EXISTS self_needs_improvement TEXT,
ADD COLUMN IF NOT EXISTS self_goals_next_period TEXT,
ADD COLUMN IF NOT EXISTS self_overall_rating INTEGER,
ADD COLUMN IF NOT EXISTS self_submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS employee_comments TEXT,
ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS manager_submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS template_id UUID,
ADD COLUMN IF NOT EXISTS competencies JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;