-- Create wiki_favorites table to store user favorites
CREATE TABLE public.wiki_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('folder', 'page')),
  item_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent duplicate favorites
CREATE UNIQUE INDEX wiki_favorites_unique ON public.wiki_favorites (user_id, item_type, item_id);

-- Create index for faster lookups
CREATE INDEX wiki_favorites_user_org ON public.wiki_favorites (user_id, organization_id);

-- Enable RLS
ALTER TABLE public.wiki_favorites ENABLE ROW LEVEL SECURITY;

-- Users can manage their own favorites
CREATE POLICY "Users can manage own favorites"
ON public.wiki_favorites
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can view favorites in their organization
CREATE POLICY "Users can view org favorites"
ON public.wiki_favorites
FOR SELECT
USING (is_org_member(auth.uid(), organization_id));