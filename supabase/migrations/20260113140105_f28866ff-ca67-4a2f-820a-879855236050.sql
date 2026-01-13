-- Add error pattern fingerprint and support ticket link to user_error_logs
ALTER TABLE public.user_error_logs
ADD COLUMN IF NOT EXISTS error_pattern_id uuid,
ADD COLUMN IF NOT EXISTS linked_support_request_id uuid REFERENCES public.support_requests(id) ON DELETE SET NULL;

-- Create error patterns table for grouping similar errors
CREATE TABLE IF NOT EXISTS public.error_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_key text NOT NULL UNIQUE,
  component_name text,
  action_attempted text,
  error_type text NOT NULL,
  first_occurrence_at timestamp with time zone NOT NULL DEFAULT now(),
  last_occurrence_at timestamp with time zone NOT NULL DEFAULT now(),
  occurrence_count integer NOT NULL DEFAULT 1,
  affected_users_count integer NOT NULL DEFAULT 0,
  affected_orgs_count integer NOT NULL DEFAULT 0,
  sample_error_message text,
  sample_error_id uuid,
  is_trending boolean DEFAULT false,
  trending_score numeric(10,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'muted')),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add foreign key constraint for error_pattern_id
ALTER TABLE public.user_error_logs
ADD CONSTRAINT user_error_logs_pattern_fk 
FOREIGN KEY (error_pattern_id) REFERENCES public.error_patterns(id) ON DELETE SET NULL;

-- Create junction table for error logs to support requests (many-to-many)
CREATE TABLE IF NOT EXISTS public.error_support_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_log_id uuid NOT NULL REFERENCES public.user_error_logs(id) ON DELETE CASCADE,
  support_request_id uuid NOT NULL REFERENCES public.support_requests(id) ON DELETE CASCADE,
  linked_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(error_log_id, support_request_id)
);

-- Enable RLS
ALTER TABLE public.error_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_support_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for error_patterns - super admins only
CREATE POLICY "Super admins can view error patterns"
ON public.error_patterns FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage error patterns"
ON public.error_patterns FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- RLS policies for error_support_links - super admins only
CREATE POLICY "Super admins can view error support links"
ON public.error_support_links FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage error support links"
ON public.error_support_links FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_error_patterns_status ON public.error_patterns(status);
CREATE INDEX IF NOT EXISTS idx_error_patterns_trending ON public.error_patterns(is_trending, trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_error_patterns_last_occurrence ON public.error_patterns(last_occurrence_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_error_logs_pattern ON public.user_error_logs(error_pattern_id);
CREATE INDEX IF NOT EXISTS idx_user_error_logs_support ON public.user_error_logs(linked_support_request_id);
CREATE INDEX IF NOT EXISTS idx_error_support_links_error ON public.error_support_links(error_log_id);
CREATE INDEX IF NOT EXISTS idx_error_support_links_support ON public.error_support_links(support_request_id);

-- Function to generate error pattern key
CREATE OR REPLACE FUNCTION public.generate_error_pattern_key(
  p_component_name text,
  p_action_attempted text,
  p_error_type text
) RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN COALESCE(p_error_type, 'unknown') || ':' || 
         COALESCE(p_component_name, 'unknown') || ':' || 
         COALESCE(p_action_attempted, 'unknown');
END;
$$;

-- Function to update error patterns on new error log
CREATE OR REPLACE FUNCTION public.update_error_pattern()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pattern_key text;
  v_pattern_id uuid;
  v_unique_users integer;
  v_unique_orgs integer;
BEGIN
  -- Generate pattern key
  v_pattern_key := generate_error_pattern_key(
    NEW.component_name, 
    NEW.action_attempted, 
    NEW.error_type
  );
  
  -- Upsert pattern
  INSERT INTO error_patterns (
    pattern_key,
    component_name,
    action_attempted,
    error_type,
    first_occurrence_at,
    last_occurrence_at,
    occurrence_count,
    sample_error_message,
    sample_error_id
  ) VALUES (
    v_pattern_key,
    NEW.component_name,
    NEW.action_attempted,
    NEW.error_type,
    NEW.created_at,
    NEW.created_at,
    1,
    NEW.error_message,
    NEW.id
  )
  ON CONFLICT (pattern_key) DO UPDATE SET
    last_occurrence_at = NEW.created_at,
    occurrence_count = error_patterns.occurrence_count + 1,
    sample_error_message = CASE 
      WHEN NEW.severity = 'critical' THEN NEW.error_message 
      ELSE error_patterns.sample_error_message 
    END,
    sample_error_id = CASE 
      WHEN NEW.severity = 'critical' THEN NEW.id 
      ELSE error_patterns.sample_error_id 
    END,
    updated_at = now()
  RETURNING id INTO v_pattern_id;
  
  -- Update error log with pattern id
  NEW.error_pattern_id := v_pattern_id;
  
  -- Calculate unique users and orgs for this pattern
  SELECT 
    COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL),
    COUNT(DISTINCT organization_id) FILTER (WHERE organization_id IS NOT NULL)
  INTO v_unique_users, v_unique_orgs
  FROM user_error_logs
  WHERE error_pattern_id = v_pattern_id;
  
  -- Update pattern stats
  UPDATE error_patterns SET
    affected_users_count = v_unique_users + CASE WHEN NEW.user_id IS NOT NULL THEN 1 ELSE 0 END,
    affected_orgs_count = v_unique_orgs + CASE WHEN NEW.organization_id IS NOT NULL THEN 1 ELSE 0 END
  WHERE id = v_pattern_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS update_error_pattern_trigger ON public.user_error_logs;
CREATE TRIGGER update_error_pattern_trigger
BEFORE INSERT ON public.user_error_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_error_pattern();

-- Function to calculate trending score (run periodically)
CREATE OR REPLACE FUNCTION public.calculate_trending_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update trending scores based on recency and velocity
  UPDATE error_patterns SET
    trending_score = (
      occurrence_count * 1.0 / GREATEST(EXTRACT(EPOCH FROM (now() - first_occurrence_at)) / 3600, 1)
    ) * (
      CASE WHEN last_occurrence_at > now() - interval '1 hour' THEN 3
           WHEN last_occurrence_at > now() - interval '6 hours' THEN 2
           WHEN last_occurrence_at > now() - interval '24 hours' THEN 1
           ELSE 0.5 END
    ) * (
      1 + (affected_users_count * 0.1) + (affected_orgs_count * 0.2)
    ),
    is_trending = (
      last_occurrence_at > now() - interval '24 hours'
      AND occurrence_count >= 3
    ),
    updated_at = now()
  WHERE status = 'active';
END;
$$;