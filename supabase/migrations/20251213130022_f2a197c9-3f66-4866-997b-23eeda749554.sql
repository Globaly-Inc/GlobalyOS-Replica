-- Create wiki_folders table for hierarchical folder structure
CREATE TABLE public.wiki_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.wiki_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.employees(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Create wiki_pages table
CREATE TABLE public.wiki_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.wiki_folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_by UUID NOT NULL REFERENCES public.employees(id),
  updated_by UUID REFERENCES public.employees(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Create wiki_page_versions for version history
CREATE TABLE public.wiki_page_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.wiki_pages(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  edited_by UUID NOT NULL REFERENCES public.employees(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wiki_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wiki_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wiki_page_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wiki_folders
CREATE POLICY "Org members can view wiki folders"
ON public.wiki_folders
FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "HR and admins can manage wiki folders"
ON public.wiki_folders
FOR ALL
USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for wiki_pages
CREATE POLICY "Org members can view wiki pages"
ON public.wiki_pages
FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "HR and admins can manage wiki pages"
ON public.wiki_pages
FOR ALL
USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for wiki_page_versions
CREATE POLICY "Org members can view wiki page versions"
ON public.wiki_page_versions
FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "HR and admins can manage wiki page versions"
ON public.wiki_page_versions
FOR ALL
USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_wiki_folders_org ON public.wiki_folders(organization_id);
CREATE INDEX idx_wiki_folders_parent ON public.wiki_folders(parent_id);
CREATE INDEX idx_wiki_pages_org ON public.wiki_pages(organization_id);
CREATE INDEX idx_wiki_pages_folder ON public.wiki_pages(folder_id);
CREATE INDEX idx_wiki_page_versions_page ON public.wiki_page_versions(page_id);

-- Full text search index for wiki pages
CREATE INDEX idx_wiki_pages_search ON public.wiki_pages USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '')));

-- Trigger for updated_at
CREATE TRIGGER update_wiki_folders_updated_at
BEFORE UPDATE ON public.wiki_folders
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_wiki_pages_updated_at
BEFORE UPDATE ON public.wiki_pages
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();