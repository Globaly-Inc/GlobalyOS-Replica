-- Extend blog_posts table with SEO and AI generation columns
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS focus_keyword TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS seo_score INTEGER DEFAULT 0;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS canonical_url TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS og_image_url TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS generation_status TEXT CHECK (generation_status IN ('pending_review', 'approved', 'rejected'));
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS generation_metadata JSONB;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS reading_time_minutes INTEGER;

-- Create blog_keywords table for SEO keyword management
CREATE TABLE IF NOT EXISTS blog_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL UNIQUE,
  search_volume INTEGER,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  relevance_score DECIMAL,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  suggested_by_ai BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_analyzed_at TIMESTAMPTZ
);

-- Create blog_post_keywords junction table
CREATE TABLE IF NOT EXISTS blog_post_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
  keyword_id UUID REFERENCES blog_keywords(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(blog_post_id, keyword_id)
);

-- Enable RLS on new tables
ALTER TABLE blog_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_keywords ENABLE ROW LEVEL SECURITY;

-- RLS policies for blog_keywords (super_admin only)
CREATE POLICY "Super admins can manage blog keywords"
ON blog_keywords FOR ALL
USING (is_super_admin(auth.uid()));

-- RLS policies for blog_post_keywords (super_admin only)
CREATE POLICY "Super admins can manage blog post keywords"
ON blog_post_keywords FOR ALL
USING (is_super_admin(auth.uid()));

-- Create blog-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for blog-images
CREATE POLICY "Blog images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'blog-images');

CREATE POLICY "Super admins can upload blog images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'blog-images' AND is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update blog images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'blog-images' AND is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete blog images"
ON storage.objects FOR DELETE
USING (bucket_id = 'blog-images' AND is_super_admin(auth.uid()));

-- Seed initial HRMS-related keywords
INSERT INTO blog_keywords (keyword, category, difficulty, relevance_score, is_active) VALUES
('HR software', 'HRMS', 'hard', 95, true),
('HRMS', 'HRMS', 'hard', 95, true),
('employee management software', 'HRMS', 'medium', 90, true),
('workforce management', 'HRMS', 'hard', 85, true),
('leave management software', 'Leave', 'medium', 88, true),
('PTO tracking', 'Leave', 'easy', 82, true),
('time off management', 'Leave', 'medium', 80, true),
('attendance tracking system', 'Attendance', 'medium', 85, true),
('employee attendance software', 'Attendance', 'medium', 83, true),
('performance review software', 'Performance', 'medium', 87, true),
('employee evaluation', 'Performance', 'easy', 75, true),
('team collaboration tools', 'Collaboration', 'hard', 80, true),
('internal wiki software', 'Wiki', 'easy', 78, true),
('knowledge management', 'Wiki', 'medium', 82, true),
('employee onboarding software', 'Onboarding', 'medium', 86, true),
('onboarding checklist', 'Onboarding', 'easy', 72, true),
('KPI tracking software', 'Performance', 'medium', 84, true),
('OKR management', 'Performance', 'medium', 80, true),
('remote team management', 'Remote', 'medium', 88, true),
('distributed team tools', 'Remote', 'easy', 75, true),
('small business HR software', 'HRMS', 'medium', 90, true),
('startup HR tools', 'HRMS', 'easy', 85, true),
('employee self-service portal', 'HRMS', 'medium', 78, true),
('HR automation', 'HRMS', 'medium', 82, true)
ON CONFLICT (keyword) DO NOTHING;