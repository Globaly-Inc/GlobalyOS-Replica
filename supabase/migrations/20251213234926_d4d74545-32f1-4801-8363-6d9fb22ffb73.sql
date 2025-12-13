-- Table to store indexed organization content for AI
CREATE TABLE public.ai_content_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  source_table TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  access_scope TEXT DEFAULT 'company',
  access_entities UUID[] DEFAULT '{}',
  indexed_at TIMESTAMPTZ DEFAULT now(),
  last_updated TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, source_table, source_id)
);

-- Track last indexing run per organization
CREATE TABLE public.ai_indexing_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  last_wiki_index TIMESTAMPTZ,
  last_chat_index TIMESTAMPTZ,
  last_team_index TIMESTAMPTZ,
  last_full_index TIMESTAMPTZ,
  next_scheduled_index TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_content_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_indexing_status ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_content_index (accessed via security definer function)
CREATE POLICY "Org members can view ai_content_index" 
ON public.ai_content_index FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

-- RLS policies for ai_indexing_status
CREATE POLICY "Org members can view ai_indexing_status" 
ON public.ai_indexing_status FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

-- Function to get accessible AI content based on user's access level
CREATE OR REPLACE FUNCTION public.get_accessible_ai_content(
  _user_id UUID,
  _organization_id UUID,
  _content_types TEXT[] DEFAULT NULL,
  _limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  content_type TEXT,
  title TEXT,
  content TEXT,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _employee_id UUID;
  _user_role TEXT;
  _user_office_id UUID;
  _user_department TEXT;
  _user_project_ids UUID[];
BEGIN
  -- Get user context
  SELECT e.id, e.office_id, e.department
  INTO _employee_id, _user_office_id, _user_department
  FROM employees e
  WHERE e.user_id = _user_id AND e.organization_id = _organization_id;

  SELECT ur.role INTO _user_role
  FROM user_roles ur
  WHERE ur.user_id = _user_id AND ur.organization_id = _organization_id;

  SELECT ARRAY_AGG(ep.project_id)
  INTO _user_project_ids
  FROM employee_projects ep
  WHERE ep.employee_id = _employee_id;

  -- Admin/HR see everything in their org
  IF _user_role IN ('admin', 'hr') THEN
    RETURN QUERY
    SELECT aci.id, aci.content_type, aci.title, aci.content, aci.metadata
    FROM ai_content_index aci
    WHERE aci.organization_id = _organization_id
      AND (_content_types IS NULL OR aci.content_type = ANY(_content_types))
    ORDER BY aci.last_updated DESC
    LIMIT _limit;
  ELSE
    -- Filter by access scope for regular users
    RETURN QUERY
    SELECT aci.id, aci.content_type, aci.title, aci.content, aci.metadata
    FROM ai_content_index aci
    WHERE aci.organization_id = _organization_id
      AND (_content_types IS NULL OR aci.content_type = ANY(_content_types))
      AND (
        aci.access_scope = 'company'
        OR aci.access_scope = 'public'
        OR (aci.access_scope = 'offices' AND _user_office_id = ANY(aci.access_entities))
        OR (aci.access_scope = 'departments' AND aci.metadata->>'department' = _user_department)
        OR (aci.access_scope = 'projects' AND aci.access_entities && COALESCE(_user_project_ids, ARRAY[]::UUID[]))
        OR (aci.access_scope = 'members' AND _employee_id = ANY(aci.access_entities))
        -- For chat: only messages from conversations/spaces user is member of
        OR (aci.content_type = 'chat' AND EXISTS (
          SELECT 1 FROM chat_participants cp 
          WHERE cp.conversation_id = (aci.metadata->>'conversation_id')::UUID
          AND cp.employee_id = _employee_id
        ))
        OR (aci.content_type = 'chat' AND EXISTS (
          SELECT 1 FROM chat_space_members csm
          WHERE csm.space_id = (aci.metadata->>'space_id')::UUID
          AND csm.employee_id = _employee_id
        ))
      )
    ORDER BY aci.last_updated DESC
    LIMIT _limit;
  END IF;
END;
$$;