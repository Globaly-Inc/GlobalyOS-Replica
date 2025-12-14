-- Create AI knowledge settings table
CREATE TABLE public.ai_knowledge_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  -- Feature toggles (all enabled by default)
  wiki_enabled BOOLEAN NOT NULL DEFAULT true,
  chat_enabled BOOLEAN NOT NULL DEFAULT true,
  team_directory_enabled BOOLEAN NOT NULL DEFAULT true,
  announcements_enabled BOOLEAN NOT NULL DEFAULT true,
  kpis_enabled BOOLEAN NOT NULL DEFAULT true,
  calendar_enabled BOOLEAN NOT NULL DEFAULT true,
  leave_enabled BOOLEAN NOT NULL DEFAULT true,
  attendance_enabled BOOLEAN NOT NULL DEFAULT true,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_knowledge_settings ENABLE ROW LEVEL SECURITY;

-- Policies: Admin can manage, members can view
CREATE POLICY "Admins can manage AI settings" ON public.ai_knowledge_settings
  FOR ALL USING (has_role(auth.uid(), 'admin') AND is_org_member(auth.uid(), organization_id))
  WITH CHECK (has_role(auth.uid(), 'admin') AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can view AI settings" ON public.ai_knowledge_settings
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

-- Updated at trigger
CREATE TRIGGER update_ai_knowledge_settings_updated_at
  BEFORE UPDATE ON public.ai_knowledge_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Update the get_accessible_ai_content function to handle new content types with role-based access
CREATE OR REPLACE FUNCTION public.get_accessible_ai_content(
  _user_id UUID, 
  _organization_id UUID, 
  _content_types TEXT[] DEFAULT NULL, 
  _limit INTEGER DEFAULT 100
)
RETURNS TABLE(id UUID, content_type TEXT, title TEXT, content TEXT, metadata JSONB)
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
  _direct_report_ids UUID[];
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

  -- Get direct report IDs for managers
  SELECT ARRAY_AGG(e.id)
  INTO _direct_report_ids
  FROM employees e
  WHERE e.manager_id = _employee_id;

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
        -- Company-wide content
        aci.access_scope = 'company'
        OR aci.access_scope = 'public'
        -- Office-specific content
        OR (aci.access_scope = 'offices' AND _user_office_id::text = ANY(aci.access_entities::text[]))
        -- Department-specific content
        OR (aci.access_scope = 'departments' AND aci.metadata->>'department' = _user_department)
        -- Project-specific content
        OR (aci.access_scope = 'projects' AND aci.access_entities && COALESCE(_user_project_ids, ARRAY[]::UUID[]))
        -- Member-specific content (own data)
        OR (aci.access_scope = 'members' AND _employee_id::text = ANY(aci.access_entities::text[]))
        -- Employee-scoped content (own + direct reports for managers)
        OR (aci.access_scope = 'employee' AND (
          _employee_id::text = ANY(aci.access_entities::text[])
          OR (COALESCE(_direct_report_ids, ARRAY[]::UUID[]) && aci.access_entities)
        ))
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