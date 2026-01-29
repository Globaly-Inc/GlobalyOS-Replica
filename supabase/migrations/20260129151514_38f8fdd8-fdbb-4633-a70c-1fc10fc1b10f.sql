-- Fix RLS policy for template_wiki_documents to allow Super Admins to view all templates (including inactive)
-- and add performance index for organization template lookups

-- Drop existing SELECT policy that only allows active templates
DROP POLICY IF EXISTS "Anyone can view active wiki templates" ON public.template_wiki_documents;

-- Create new policy that allows Super Admins to see all templates, others see only active
CREATE POLICY "Super admins can view all wiki templates, others see active only" 
ON public.template_wiki_documents 
FOR SELECT 
USING (public.is_super_admin() OR is_active = true);

-- Same for folders
DROP POLICY IF EXISTS "Anyone can view active wiki folders" ON public.template_wiki_folders;

CREATE POLICY "Super admins can view all wiki folders, others see active only" 
ON public.template_wiki_folders 
FOR SELECT 
USING (public.is_super_admin() OR is_active = true);

-- Add performance index for organization template lookups
CREATE INDEX IF NOT EXISTS idx_template_wiki_documents_org_filter 
ON public.template_wiki_documents (business_category, country_code, is_active) 
WHERE is_active = true;