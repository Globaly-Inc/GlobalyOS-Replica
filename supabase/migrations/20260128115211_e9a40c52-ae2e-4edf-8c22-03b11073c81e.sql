-- Create activity log table for tracking member additions/removals
CREATE TABLE public.chat_space_member_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES public.chat_spaces(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('added', 'removed')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto_sync', 'space_creation')),
  performed_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_space_member_logs_space ON public.chat_space_member_logs(space_id);
CREATE INDEX idx_space_member_logs_created ON public.chat_space_member_logs(created_at DESC);
CREATE INDEX idx_space_member_logs_org ON public.chat_space_member_logs(organization_id);

-- Enable RLS
ALTER TABLE public.chat_space_member_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Space members can view logs"
  ON public.chat_space_member_logs FOR SELECT
  USING (is_space_member(space_id, get_current_employee_id_for_org(organization_id)));

-- Enable realtime for logs table only (chat_space_members already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_space_member_logs;

-- Update sync_company_space_members to log auto-sync actions
CREATE OR REPLACE FUNCTION sync_company_space_members()
RETURNS TRIGGER AS $$
DECLARE
  inserted_row RECORD;
  deleted_space_id UUID;
BEGIN
  -- Employee became active: add to all company-wide auto-sync spaces
  IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'active') THEN
    FOR inserted_row IN
      INSERT INTO chat_space_members (space_id, employee_id, organization_id, role)
      SELECT cs.id, NEW.id, cs.organization_id, 'member'
      FROM chat_spaces cs
      WHERE cs.organization_id = NEW.organization_id
        AND cs.access_scope = 'company'
        AND cs.auto_sync_members = true
        AND cs.archived_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM chat_space_members csm 
          WHERE csm.space_id = cs.id AND csm.employee_id = NEW.id
        )
      RETURNING space_id, organization_id
    LOOP
      INSERT INTO chat_space_member_logs (space_id, employee_id, organization_id, action_type, source)
      VALUES (inserted_row.space_id, NEW.id, inserted_row.organization_id, 'added', 'auto_sync');
    END LOOP;
  END IF;

  -- Employee became inactive: remove from all auto-sync spaces (with logging)
  IF NEW.status = 'inactive' AND OLD.status = 'active' THEN
    FOR deleted_space_id IN
      SELECT id FROM chat_spaces 
      WHERE organization_id = NEW.organization_id
        AND auto_sync_members = true
    LOOP
      -- Log before delete
      INSERT INTO chat_space_member_logs (space_id, employee_id, organization_id, action_type, source)
      SELECT deleted_space_id, NEW.id, NEW.organization_id, 'removed', 'auto_sync'
      WHERE EXISTS (SELECT 1 FROM chat_space_members WHERE employee_id = NEW.id AND space_id = deleted_space_id);
      
      DELETE FROM chat_space_members
      WHERE employee_id = NEW.id AND space_id = deleted_space_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update sync_office_space_members to log auto-sync actions
CREATE OR REPLACE FUNCTION sync_office_space_members()
RETURNS TRIGGER AS $$
DECLARE
  inserted_row RECORD;
  removed_space RECORD;
BEGIN
  -- Employee office changed or became active: sync with office-based spaces
  IF NEW.status = 'active' AND NEW.office_id IS NOT NULL THEN
    -- Add to office spaces they should be in
    FOR inserted_row IN
      INSERT INTO chat_space_members (space_id, employee_id, organization_id, role)
      SELECT cs.id, NEW.id, cs.organization_id, 'member'
      FROM chat_spaces cs
      JOIN chat_space_offices cso ON cso.space_id = cs.id
      WHERE cs.organization_id = NEW.organization_id
        AND cs.access_scope = 'offices'
        AND cs.auto_sync_members = true
        AND cs.archived_at IS NULL
        AND cso.office_id = NEW.office_id
        AND NOT EXISTS (
          SELECT 1 FROM chat_space_members csm 
          WHERE csm.space_id = cs.id AND csm.employee_id = NEW.id
        )
      RETURNING space_id, organization_id
    LOOP
      INSERT INTO chat_space_member_logs (space_id, employee_id, organization_id, action_type, source)
      VALUES (inserted_row.space_id, NEW.id, inserted_row.organization_id, 'added', 'auto_sync');
    END LOOP;
  END IF;

  -- Remove from office spaces they no longer belong to (office changed)
  IF OLD IS NOT NULL AND OLD.office_id IS DISTINCT FROM NEW.office_id THEN
    FOR removed_space IN
      SELECT csm.space_id, csm.organization_id
      FROM chat_space_members csm
      JOIN chat_spaces cs ON cs.id = csm.space_id
      JOIN chat_space_offices cso ON cso.space_id = cs.id
      WHERE csm.employee_id = NEW.id
        AND cs.access_scope = 'offices'
        AND cs.auto_sync_members = true
        AND cso.office_id = OLD.office_id
        AND NOT EXISTS (
          SELECT 1 FROM chat_space_offices cso2
          WHERE cso2.space_id = cs.id AND cso2.office_id = NEW.office_id
        )
    LOOP
      INSERT INTO chat_space_member_logs (space_id, employee_id, organization_id, action_type, source)
      VALUES (removed_space.space_id, NEW.id, removed_space.organization_id, 'removed', 'auto_sync');
      
      DELETE FROM chat_space_members
      WHERE space_id = removed_space.space_id AND employee_id = NEW.id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;