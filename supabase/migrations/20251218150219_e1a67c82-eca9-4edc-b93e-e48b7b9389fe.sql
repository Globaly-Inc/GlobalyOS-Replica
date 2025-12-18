-- Create support_request_comments table
CREATE TABLE public.support_request_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.support_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create support_request_subscribers table
CREATE TABLE public.support_request_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.support_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(request_id, user_id)
);

-- Create support_request_activity_logs table
CREATE TABLE public.support_request_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.support_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('status_change', 'priority_change', 'comment_added', 'subscriber_added', 'subscriber_removed', 'notes_updated', 'created')),
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.support_request_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_request_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_request_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS for comments: Super admins can manage all, request owner and subscribers can view and comment
CREATE POLICY "Super admins can manage all comments"
ON public.support_request_comments FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Request owner can manage own comments"
ON public.support_request_comments FOR ALL
USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM support_requests sr WHERE sr.id = request_id AND sr.user_id = auth.uid())
)
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Subscribers can view comments"
ON public.support_request_comments FOR SELECT
USING (
  EXISTS (SELECT 1 FROM support_request_subscribers srs WHERE srs.request_id = support_request_comments.request_id AND srs.user_id = auth.uid())
);

CREATE POLICY "Subscribers can add comments"
ON public.support_request_comments FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM support_request_subscribers srs WHERE srs.request_id = support_request_comments.request_id AND srs.user_id = auth.uid())
);

-- RLS for subscribers: Super admins can manage all, request owner can view
CREATE POLICY "Super admins can manage all subscribers"
ON public.support_request_subscribers FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Request owner can view subscribers"
ON public.support_request_subscribers FOR SELECT
USING (
  EXISTS (SELECT 1 FROM support_requests sr WHERE sr.id = request_id AND sr.user_id = auth.uid())
);

CREATE POLICY "Users can see own subscriptions"
ON public.support_request_subscribers FOR SELECT
USING (user_id = auth.uid());

-- RLS for activity logs: Super admins can manage all, subscribers can view
CREATE POLICY "Super admins can manage all activity logs"
ON public.support_request_activity_logs FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Subscribers can view activity logs"
ON public.support_request_activity_logs FOR SELECT
USING (
  EXISTS (SELECT 1 FROM support_request_subscribers srs WHERE srs.request_id = support_request_activity_logs.request_id AND srs.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM support_requests sr WHERE sr.id = request_id AND sr.user_id = auth.uid())
);

-- Create indexes for performance
CREATE INDEX idx_support_request_comments_request_id ON public.support_request_comments(request_id);
CREATE INDEX idx_support_request_subscribers_request_id ON public.support_request_subscribers(request_id);
CREATE INDEX idx_support_request_activity_logs_request_id ON public.support_request_activity_logs(request_id);
CREATE INDEX idx_support_request_activity_logs_created_at ON public.support_request_activity_logs(created_at DESC);

-- Function to auto-add requestor as subscriber when request is created
CREATE OR REPLACE FUNCTION public.auto_subscribe_requestor()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.support_request_subscribers (request_id, user_id)
  VALUES (NEW.id, NEW.user_id)
  ON CONFLICT (request_id, user_id) DO NOTHING;
  
  -- Also log the creation
  INSERT INTO public.support_request_activity_logs (request_id, user_id, action_type, new_value)
  VALUES (NEW.id, NEW.user_id, 'created', NEW.title);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-subscribe requestor
CREATE TRIGGER trigger_auto_subscribe_requestor
AFTER INSERT ON public.support_requests
FOR EACH ROW EXECUTE FUNCTION public.auto_subscribe_requestor();