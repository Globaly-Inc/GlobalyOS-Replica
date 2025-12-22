
-- =====================================================
-- UNIFIED SOCIAL FEED DATABASE SCHEMA
-- =====================================================

-- =====================================================
-- 1. CREATE POSTS TABLE (Unified)
-- =====================================================
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  
  -- Post type: 'win', 'kudos', 'announcement', 'social', 'executive_message'
  post_type TEXT NOT NULL CHECK (post_type IN ('win', 'kudos', 'announcement', 'social', 'executive_message')),
  
  content TEXT NOT NULL,
  
  -- For kudos type: who is receiving the kudos (required for kudos posts)
  kudos_recipient_ids UUID[] DEFAULT '{}',
  
  -- Visibility scope
  access_scope TEXT DEFAULT 'company' CHECK (access_scope IN ('company', 'offices', 'departments', 'projects')),
  
  -- Pinning (only admins can pin)
  is_pinned BOOLEAN DEFAULT false,
  pinned_at TIMESTAMPTZ,
  pinned_by UUID REFERENCES public.employees(id),
  
  -- Scheduling for executive messages
  scheduled_at TIMESTAMPTZ,
  is_published BOOLEAN DEFAULT true,
  
  -- Soft delete for moderation
  is_deleted BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for posts
CREATE INDEX idx_posts_organization_id ON public.posts(organization_id);
CREATE INDEX idx_posts_employee_id ON public.posts(employee_id);
CREATE INDEX idx_posts_post_type ON public.posts(post_type);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX idx_posts_is_pinned ON public.posts(is_pinned) WHERE is_pinned = true;
CREATE INDEX idx_posts_scheduled_at ON public.posts(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- Enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. CREATE POST_MEDIA TABLE (Multiple Photos/Videos/Embeds)
-- =====================================================
CREATE TABLE public.post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'embed')),
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  sort_order INTEGER DEFAULT 0,
  
  -- For embedded content (YouTube, Twitter, etc.)
  embed_type TEXT, -- 'youtube', 'twitter', 'instagram', 'linkedin', 'tiktok', 'vimeo', 'loom'
  embed_metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_post_media_post_id ON public.post_media(post_id);
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. CREATE POST_LINK_PREVIEWS TABLE
-- =====================================================
CREATE TABLE public.post_link_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  image_url TEXT,
  site_name TEXT,
  favicon_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_post_link_previews_post_id ON public.post_link_previews(post_id);
ALTER TABLE public.post_link_previews ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. CREATE POST_POLLS TABLE
-- =====================================================
CREATE TABLE public.post_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  question TEXT NOT NULL,
  allow_multiple BOOLEAN DEFAULT false,
  ends_at TIMESTAMPTZ,
  is_anonymous BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_post_polls_post_id ON public.post_polls(post_id);
ALTER TABLE public.post_polls ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. CREATE POLL_OPTIONS TABLE
-- =====================================================
CREATE TABLE public.poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.post_polls(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  option_text TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_poll_options_poll_id ON public.poll_options(poll_id);
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. CREATE POLL_VOTES TABLE
-- =====================================================
CREATE TABLE public.poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.post_polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(poll_id, option_id, employee_id)
);

CREATE INDEX idx_poll_votes_poll_id ON public.poll_votes(poll_id);
CREATE INDEX idx_poll_votes_option_id ON public.poll_votes(option_id);
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. CREATE POST_MENTIONS TABLE
-- =====================================================
CREATE TABLE public.post_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(post_id, employee_id)
);

CREATE INDEX idx_post_mentions_post_id ON public.post_mentions(post_id);
CREATE INDEX idx_post_mentions_employee_id ON public.post_mentions(employee_id);
ALTER TABLE public.post_mentions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 8. CREATE POST_COMMENTS TABLE
-- =====================================================
CREATE TABLE public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
  
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX idx_post_comments_employee_id ON public.post_comments(employee_id);
CREATE INDEX idx_post_comments_parent_id ON public.post_comments(parent_comment_id);
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 9. CREATE COMMENT_MENTIONS TABLE
-- =====================================================
CREATE TABLE public.comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(comment_id, employee_id)
);

CREATE INDEX idx_comment_mentions_comment_id ON public.comment_mentions(comment_id);
CREATE INDEX idx_comment_mentions_employee_id ON public.comment_mentions(employee_id);
ALTER TABLE public.comment_mentions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 10. CREATE POST_REACTIONS TABLE
-- =====================================================
CREATE TABLE public.post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(post_id, employee_id, emoji)
);

CREATE INDEX idx_post_reactions_post_id ON public.post_reactions(post_id);
CREATE INDEX idx_post_reactions_employee_id ON public.post_reactions(employee_id);
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 11. CREATE COMMENT_REACTIONS TABLE
-- =====================================================
CREATE TABLE public.comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(comment_id, employee_id, emoji)
);

CREATE INDEX idx_comment_reactions_comment_id ON public.comment_reactions(comment_id);
CREATE INDEX idx_comment_reactions_employee_id ON public.comment_reactions(employee_id);
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 12. CREATE POST_OFFICES TABLE (Visibility)
-- =====================================================
CREATE TABLE public.post_offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(post_id, office_id)
);

CREATE INDEX idx_post_offices_post_id ON public.post_offices(post_id);
ALTER TABLE public.post_offices ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 13. CREATE POST_DEPARTMENTS TABLE (Visibility)
-- =====================================================
CREATE TABLE public.post_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(post_id, department)
);

CREATE INDEX idx_post_departments_post_id ON public.post_departments(post_id);
ALTER TABLE public.post_departments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 14. CREATE POST_PROJECTS TABLE (Visibility)
-- =====================================================
CREATE TABLE public.post_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(post_id, project_id)
);

CREATE INDEX idx_post_projects_post_id ON public.post_projects(post_id);
ALTER TABLE public.post_projects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 15. SECURITY DEFINER FUNCTIONS
-- =====================================================

-- Function to check if user can insert a specific post type (role-based)
CREATE OR REPLACE FUNCTION public.can_insert_post(
  _employee_id uuid,
  _organization_id uuid,
  _post_type text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = _employee_id
      AND e.organization_id = _organization_id
      AND e.user_id = auth.uid()
      AND e.status = 'active'
      AND (
        -- Anyone can post: win, kudos, social
        _post_type IN ('win', 'kudos', 'social')
        -- Announcement: Owner, Admin, HR only
        OR (_post_type = 'announcement' AND (
          has_role(auth.uid(), 'owner'::app_role) OR 
          has_role(auth.uid(), 'admin'::app_role) OR 
          has_role(auth.uid(), 'hr'::app_role)
        ))
        -- Executive Message: Owner, Admin only
        OR (_post_type = 'executive_message' AND (
          has_role(auth.uid(), 'owner'::app_role) OR 
          has_role(auth.uid(), 'admin'::app_role)
        ))
      )
  )
$$;

-- Function to check if user can view a post (based on visibility)
CREATE OR REPLACE FUNCTION public.can_view_post(_post_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _employee record;
  _post record;
BEGIN
  -- Super admin can view everything
  IF is_super_admin(_user_id) THEN
    RETURN true;
  END IF;

  -- Load post first
  SELECT p.organization_id, p.access_scope, p.employee_id, p.is_deleted, p.is_published, p.scheduled_at
  INTO _post
  FROM public.posts p
  WHERE p.id = _post_id;

  IF _post IS NULL THEN
    RETURN false;
  END IF;

  -- Don't show deleted posts
  IF _post.is_deleted THEN
    RETURN false;
  END IF;

  -- Get employee record for this org
  SELECT e.id, e.organization_id, e.office_id, e.department
  INTO _employee
  FROM public.employees e
  WHERE e.user_id = _user_id
    AND e.organization_id = _post.organization_id
  LIMIT 1;

  IF _employee IS NULL THEN
    RETURN false;
  END IF;

  -- Author can always view their own posts (including scheduled/unpublished)
  IF _post.employee_id = _employee.id THEN
    RETURN true;
  END IF;

  -- Owner/Admin/HR can view everything in their org (including scheduled)
  IF has_role(_user_id, 'owner'::app_role) OR has_role(_user_id, 'admin'::app_role) OR has_role(_user_id, 'hr'::app_role) THEN
    RETURN true;
  END IF;

  -- For regular users, check if post is published
  IF NOT _post.is_published THEN
    RETURN false;
  END IF;

  -- Check if scheduled post should be visible (only if scheduled_at is in the past or null)
  IF _post.scheduled_at IS NOT NULL AND _post.scheduled_at > now() THEN
    RETURN false;
  END IF;

  -- Access scope checks
  CASE COALESCE(_post.access_scope, 'company')
    WHEN 'company' THEN
      RETURN true;
    WHEN 'offices' THEN
      RETURN EXISTS (
        SELECT 1
        FROM public.post_offices po
        WHERE po.post_id = _post_id
          AND po.office_id = _employee.office_id
      );
    WHEN 'departments' THEN
      RETURN EXISTS (
        SELECT 1
        FROM public.post_departments pd
        WHERE pd.post_id = _post_id
          AND pd.department = _employee.department
      );
    WHEN 'projects' THEN
      RETURN EXISTS (
        SELECT 1
        FROM public.post_projects pp
        JOIN public.employee_projects ep ON ep.project_id = pp.project_id
        WHERE pp.post_id = _post_id
          AND ep.employee_id = _employee.id
      );
    ELSE
      RETURN true;
  END CASE;
END;
$$;

-- Function to check if user owns the post
CREATE OR REPLACE FUNCTION public.owns_post(_post_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.posts p
    JOIN public.employees e ON e.id = p.employee_id
    WHERE p.id = _post_id AND e.user_id = auth.uid()
  )
$$;

-- Function to check if user owns the comment
CREATE OR REPLACE FUNCTION public.owns_comment(_comment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.post_comments c
    JOIN public.employees e ON e.id = c.employee_id
    WHERE c.id = _comment_id AND e.user_id = auth.uid()
  )
$$;

-- =====================================================
-- 16. RLS POLICIES FOR POSTS
-- =====================================================

-- View posts based on visibility
CREATE POLICY "Users can view accessible posts"
ON public.posts FOR SELECT TO authenticated
USING (can_view_post(id, auth.uid()));

-- Insert posts with role-based restrictions
CREATE POLICY "Users can create posts"
ON public.posts FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND can_insert_post(employee_id, organization_id, post_type)
);

-- Update own posts
CREATE POLICY "Users can update own posts"
ON public.posts FOR UPDATE TO authenticated
USING (owns_post(id));

-- HR and admins can update any posts in their org
CREATE POLICY "HR and admins can update any posts"
ON public.posts FOR UPDATE TO authenticated
USING (
  is_org_member(auth.uid(), organization_id) AND
  (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role))
);

-- Delete own posts (soft delete)
CREATE POLICY "Users can delete own posts"
ON public.posts FOR DELETE TO authenticated
USING (owns_post(id));

-- HR and admins can delete any posts in their org
CREATE POLICY "HR and admins can delete any posts"
ON public.posts FOR DELETE TO authenticated
USING (
  is_org_member(auth.uid(), organization_id) AND
  (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role))
);

-- =====================================================
-- 17. RLS POLICIES FOR POST_MEDIA
-- =====================================================

CREATE POLICY "Users can view post media if they can view the post"
ON public.post_media FOR SELECT TO authenticated
USING (can_view_post(post_id, auth.uid()));

CREATE POLICY "Post authors can manage their media"
ON public.post_media FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND owns_post(p.id)))
WITH CHECK (EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND owns_post(p.id)));

-- =====================================================
-- 18. RLS POLICIES FOR POST_LINK_PREVIEWS
-- =====================================================

CREATE POLICY "Users can view link previews if they can view the post"
ON public.post_link_previews FOR SELECT TO authenticated
USING (can_view_post(post_id, auth.uid()));

CREATE POLICY "Post authors can manage their link previews"
ON public.post_link_previews FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND owns_post(p.id)))
WITH CHECK (EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND owns_post(p.id)));

-- =====================================================
-- 19. RLS POLICIES FOR POLLS
-- =====================================================

CREATE POLICY "Users can view polls if they can view the post"
ON public.post_polls FOR SELECT TO authenticated
USING (can_view_post(post_id, auth.uid()));

CREATE POLICY "Post authors can manage their polls"
ON public.post_polls FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND owns_post(p.id)))
WITH CHECK (EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND owns_post(p.id)));

-- Poll options
CREATE POLICY "Users can view poll options if they can view the poll"
ON public.poll_options FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM post_polls pp WHERE pp.id = poll_id AND can_view_post(pp.post_id, auth.uid())));

CREATE POLICY "Poll authors can manage their options"
ON public.poll_options FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM post_polls pp JOIN posts p ON p.id = pp.post_id WHERE pp.id = poll_id AND owns_post(p.id)))
WITH CHECK (EXISTS (SELECT 1 FROM post_polls pp JOIN posts p ON p.id = pp.post_id WHERE pp.id = poll_id AND owns_post(p.id)));

-- Poll votes
CREATE POLICY "Users can view votes in their org"
ON public.poll_votes FOR SELECT TO authenticated
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can vote on polls they can view"
ON public.poll_votes FOR INSERT TO authenticated
WITH CHECK (
  employee_id = get_current_employee_id() AND
  EXISTS (SELECT 1 FROM post_polls pp WHERE pp.id = poll_id AND can_view_post(pp.post_id, auth.uid()))
);

CREATE POLICY "Users can remove their own votes"
ON public.poll_votes FOR DELETE TO authenticated
USING (employee_id = get_current_employee_id());

-- =====================================================
-- 20. RLS POLICIES FOR POST_MENTIONS
-- =====================================================

CREATE POLICY "Users can view mentions if they can view the post"
ON public.post_mentions FOR SELECT TO authenticated
USING (can_view_post(post_id, auth.uid()));

CREATE POLICY "Post authors can manage mentions"
ON public.post_mentions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND owns_post(p.id)))
WITH CHECK (EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND owns_post(p.id)));

-- =====================================================
-- 21. RLS POLICIES FOR POST_COMMENTS
-- =====================================================

CREATE POLICY "Users can view comments if they can view the post"
ON public.post_comments FOR SELECT TO authenticated
USING (can_view_post(post_id, auth.uid()) AND is_deleted = false);

CREATE POLICY "Users can create comments on posts they can view"
ON public.post_comments FOR INSERT TO authenticated
WITH CHECK (
  employee_id = get_current_employee_id() AND
  can_view_post(post_id, auth.uid())
);

CREATE POLICY "Users can update own comments"
ON public.post_comments FOR UPDATE TO authenticated
USING (owns_comment(id));

CREATE POLICY "Users can delete own comments"
ON public.post_comments FOR DELETE TO authenticated
USING (owns_comment(id));

CREATE POLICY "HR and admins can delete any comments"
ON public.post_comments FOR DELETE TO authenticated
USING (
  is_org_member(auth.uid(), organization_id) AND
  (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role))
);

-- =====================================================
-- 22. RLS POLICIES FOR COMMENT_MENTIONS
-- =====================================================

CREATE POLICY "Users can view comment mentions if they can view the post"
ON public.comment_mentions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM post_comments c WHERE c.id = comment_id AND can_view_post(c.post_id, auth.uid())));

CREATE POLICY "Comment authors can manage mentions"
ON public.comment_mentions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM post_comments c WHERE c.id = comment_id AND owns_comment(c.id)))
WITH CHECK (EXISTS (SELECT 1 FROM post_comments c WHERE c.id = comment_id AND owns_comment(c.id)));

-- =====================================================
-- 23. RLS POLICIES FOR POST_REACTIONS
-- =====================================================

CREATE POLICY "Users can view reactions if they can view the post"
ON public.post_reactions FOR SELECT TO authenticated
USING (can_view_post(post_id, auth.uid()));

CREATE POLICY "Users can add reactions to posts they can view"
ON public.post_reactions FOR INSERT TO authenticated
WITH CHECK (
  employee_id = get_current_employee_id() AND
  can_view_post(post_id, auth.uid())
);

CREATE POLICY "Users can remove their own reactions"
ON public.post_reactions FOR DELETE TO authenticated
USING (employee_id = get_current_employee_id());

-- =====================================================
-- 24. RLS POLICIES FOR COMMENT_REACTIONS
-- =====================================================

CREATE POLICY "Users can view comment reactions in their org"
ON public.comment_reactions FOR SELECT TO authenticated
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can add reactions to comments"
ON public.comment_reactions FOR INSERT TO authenticated
WITH CHECK (
  employee_id = get_current_employee_id() AND
  is_org_member(auth.uid(), organization_id)
);

CREATE POLICY "Users can remove their own comment reactions"
ON public.comment_reactions FOR DELETE TO authenticated
USING (employee_id = get_current_employee_id());

-- =====================================================
-- 25. RLS POLICIES FOR VISIBILITY TABLES
-- =====================================================

-- Post offices
CREATE POLICY "Users can view post offices if they can view the post"
ON public.post_offices FOR SELECT TO authenticated
USING (can_view_post(post_id, auth.uid()));

CREATE POLICY "Post authors can manage post offices"
ON public.post_offices FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND owns_post(p.id)))
WITH CHECK (EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND owns_post(p.id)));

-- Post departments
CREATE POLICY "Users can view post departments if they can view the post"
ON public.post_departments FOR SELECT TO authenticated
USING (can_view_post(post_id, auth.uid()));

CREATE POLICY "Post authors can manage post departments"
ON public.post_departments FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND owns_post(p.id)))
WITH CHECK (EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND owns_post(p.id)));

-- Post projects
CREATE POLICY "Users can view post projects if they can view the post"
ON public.post_projects FOR SELECT TO authenticated
USING (can_view_post(post_id, auth.uid()));

CREATE POLICY "Post authors can manage post projects"
ON public.post_projects FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND owns_post(p.id)))
WITH CHECK (EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND owns_post(p.id)));

-- =====================================================
-- 26. TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_post_comments_updated_at
BEFORE UPDATE ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 27. ENABLE REALTIME FOR KEY TABLES
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_reactions;
