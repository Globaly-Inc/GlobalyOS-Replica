-- Wiki Templates Tables for Super Admin
-- Phase 1: Database tables + RLS policies

-- Categories for wiki templates
CREATE TYPE public.wiki_template_category AS ENUM (
  'policies',
  'sops',
  'business_plans',
  'hr_documents',
  'compliance',
  'operations'
);

-- Template Wiki Documents table
CREATE TABLE public.template_wiki_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category wiki_template_category NOT NULL,
  subcategory TEXT,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT,
  business_category TEXT,
  country_code TEXT,
  icon_name TEXT DEFAULT 'FileText',
  tags TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Template Wiki Folders table (for hierarchical organization)
CREATE TABLE public.template_wiki_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.template_wiki_folders(id) ON DELETE CASCADE,
  description TEXT,
  icon_name TEXT DEFAULT 'Folder',
  business_category TEXT,
  country_code TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add folder reference to documents
ALTER TABLE public.template_wiki_documents 
ADD COLUMN folder_id UUID REFERENCES public.template_wiki_folders(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_template_wiki_documents_category ON public.template_wiki_documents(category);
CREATE INDEX idx_template_wiki_documents_business_category ON public.template_wiki_documents(business_category);
CREATE INDEX idx_template_wiki_documents_country_code ON public.template_wiki_documents(country_code);
CREATE INDEX idx_template_wiki_documents_folder ON public.template_wiki_documents(folder_id);
CREATE INDEX idx_template_wiki_documents_active ON public.template_wiki_documents(is_active);
CREATE INDEX idx_template_wiki_folders_parent ON public.template_wiki_folders(parent_id);

-- Enable RLS
ALTER TABLE public.template_wiki_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_wiki_folders ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Everyone can read active templates (for organization use)
CREATE POLICY "Anyone can view active wiki templates" 
ON public.template_wiki_documents 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Anyone can view active wiki template folders" 
ON public.template_wiki_folders 
FOR SELECT 
USING (is_active = true);

-- Super Admin full access policies for documents (using existing is_super_admin function)
CREATE POLICY "Super admins can insert wiki templates" 
ON public.template_wiki_documents 
FOR INSERT 
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update wiki templates" 
ON public.template_wiki_documents 
FOR UPDATE 
USING (public.is_super_admin());

CREATE POLICY "Super admins can delete wiki templates" 
ON public.template_wiki_documents 
FOR DELETE 
USING (public.is_super_admin());

-- Super Admin full access policies for folders
CREATE POLICY "Super admins can insert wiki template folders" 
ON public.template_wiki_folders 
FOR INSERT 
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update wiki template folders" 
ON public.template_wiki_folders 
FOR UPDATE 
USING (public.is_super_admin());

CREATE POLICY "Super admins can delete wiki template folders" 
ON public.template_wiki_folders 
FOR DELETE 
USING (public.is_super_admin());

-- Trigger for updated_at
CREATE TRIGGER update_template_wiki_documents_updated_at
  BEFORE UPDATE ON public.template_wiki_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_template_wiki_folders_updated_at
  BEFORE UPDATE ON public.template_wiki_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();