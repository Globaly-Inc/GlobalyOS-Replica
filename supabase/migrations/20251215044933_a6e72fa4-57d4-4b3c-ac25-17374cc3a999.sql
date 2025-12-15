-- Create wiki page comments table for threaded discussions
CREATE TABLE public.wiki_page_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.wiki_pages(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.wiki_page_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_wiki_page_comments_page_id ON public.wiki_page_comments(page_id);
CREATE INDEX idx_wiki_page_comments_parent ON public.wiki_page_comments(parent_comment_id);
CREATE INDEX idx_wiki_page_comments_org ON public.wiki_page_comments(organization_id);

-- Enable RLS
ALTER TABLE public.wiki_page_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for wiki page comments
CREATE POLICY "Users can view comments in their organization"
ON public.wiki_page_comments
FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can create comments in their organization"
ON public.wiki_page_comments
FOR INSERT
WITH CHECK (
  is_org_member(auth.uid(), organization_id) AND
  created_by = get_current_employee_id()
);

CREATE POLICY "Users can update their own comments"
ON public.wiki_page_comments
FOR UPDATE
USING (created_by = get_current_employee_id());

CREATE POLICY "Users can delete their own comments or admins/HR can delete any"
ON public.wiki_page_comments
FOR DELETE
USING (
  created_by = get_current_employee_id() OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'hr'::app_role)
);

-- Create updated_at trigger
CREATE TRIGGER update_wiki_page_comments_updated_at
BEFORE UPDATE ON public.wiki_page_comments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();