-- Support Categories table
CREATE TABLE public.support_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  icon text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Support Articles table
CREATE TABLE public.support_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.support_categories(id) ON DELETE SET NULL,
  module text NOT NULL, -- 'team', 'leave', 'attendance', 'calendar', 'kpi', 'reviews', 'wiki', 'chat', 'tasks', 'crm', 'payroll', 'settings', 'general'
  title text NOT NULL,
  slug text NOT NULL,
  content text, -- Markdown content
  excerpt text,
  cover_image_url text,
  screenshots jsonb DEFAULT '[]'::jsonb, -- Array of screenshot URLs
  sort_order integer DEFAULT 0,
  is_published boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  view_count integer DEFAULT 0,
  helpful_yes integer DEFAULT 0,
  helpful_no integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(module, slug)
);

-- Support Screenshots table for automated capture
CREATE TABLE public.support_screenshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES public.support_articles(id) ON DELETE CASCADE,
  route_path text NOT NULL, -- The route to capture
  description text,
  storage_path text, -- Path in storage bucket
  status text DEFAULT 'pending', -- 'pending', 'capturing', 'completed', 'failed'
  error_message text,
  captured_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- API Documentation table for auto-generated docs
CREATE TABLE public.api_documentation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL UNIQUE,
  description text,
  method text DEFAULT 'POST',
  is_public boolean DEFAULT false, -- Does not require auth
  request_schema jsonb,
  response_schema jsonb,
  example_request jsonb,
  example_response jsonb,
  tags text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  last_scanned_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.support_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_documentation ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_categories
CREATE POLICY "Anyone authenticated can view active categories" 
ON public.support_categories FOR SELECT 
USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Super admins can manage categories" 
ON public.support_categories FOR ALL 
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- RLS Policies for support_articles
CREATE POLICY "Anyone authenticated can view published articles" 
ON public.support_articles FOR SELECT 
USING (auth.uid() IS NOT NULL AND is_published = true);

CREATE POLICY "Super admins can manage articles" 
ON public.support_articles FOR ALL 
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- RLS Policies for support_screenshots
CREATE POLICY "Anyone authenticated can view screenshots" 
ON public.support_screenshots FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can manage screenshots" 
ON public.support_screenshots FOR ALL 
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- RLS Policies for api_documentation
CREATE POLICY "Anyone authenticated can view API docs" 
ON public.api_documentation FOR SELECT 
USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Super admins can manage API docs" 
ON public.api_documentation FOR ALL 
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Create storage bucket for documentation screenshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('doc_screenshots', 'doc_screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for doc_screenshots bucket
CREATE POLICY "Anyone can view doc screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'doc_screenshots');

CREATE POLICY "Super admins can upload doc screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'doc_screenshots' AND is_super_admin());

CREATE POLICY "Super admins can update doc screenshots"
ON storage.objects FOR UPDATE
USING (bucket_id = 'doc_screenshots' AND is_super_admin());

CREATE POLICY "Super admins can delete doc screenshots"
ON storage.objects FOR DELETE
USING (bucket_id = 'doc_screenshots' AND is_super_admin());

-- Create indexes for performance
CREATE INDEX idx_support_articles_module ON public.support_articles(module);
CREATE INDEX idx_support_articles_category ON public.support_articles(category_id);
CREATE INDEX idx_support_articles_published ON public.support_articles(is_published);
CREATE INDEX idx_support_screenshots_article ON public.support_screenshots(article_id);
CREATE INDEX idx_support_screenshots_status ON public.support_screenshots(status);

-- Seed initial categories
INSERT INTO public.support_categories (name, slug, description, icon, sort_order, is_active) VALUES
('Getting Started', 'getting-started', 'Learn the basics of GlobalyOS', 'Rocket', 1, true),
('Team Management', 'team-management', 'Managing your team and employees', 'Users', 2, true),
('Leave & Attendance', 'leave-attendance', 'Leave requests and attendance tracking', 'Calendar', 3, true),
('Performance', 'performance', 'KPIs, OKRs, and performance reviews', 'Target', 4, true),
('Knowledge Base', 'knowledge-base', 'Wiki and documentation', 'BookOpen', 5, true),
('Communication', 'communication', 'Chat, announcements, and team updates', 'MessageSquare', 6, true),
('FAQ', 'faq', 'Frequently asked questions', 'HelpCircle', 7, true),
('API Reference', 'api-reference', 'API documentation for developers', 'Code', 8, true)
ON CONFLICT (slug) DO NOTHING;