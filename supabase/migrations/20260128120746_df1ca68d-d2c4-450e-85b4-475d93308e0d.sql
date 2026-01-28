-- Add source column to track how member was added
ALTER TABLE public.chat_space_members 
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

-- Add check constraint
ALTER TABLE public.chat_space_members
  ADD CONSTRAINT chat_space_members_source_check 
  CHECK (source IN ('manual', 'auto_sync', 'space_creation'));

-- Update existing members: set source to 'auto_sync' if space has auto_sync_members enabled
UPDATE public.chat_space_members csm
SET source = 'auto_sync'
FROM public.chat_spaces cs
WHERE csm.space_id = cs.id 
  AND cs.auto_sync_members = true;

-- Update the sync_company_space_members function to set source = 'auto_sync'
CREATE OR REPLACE FUNCTION public.sync_company_space_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space RECORD;
  v_employee RECORD;
BEGIN
  -- For each company-wide space with auto_sync enabled
  FOR v_space IN 
    SELECT id, organization_id, created_by
    FROM public.chat_spaces 
    WHERE organization_id = COALESCE(NEW.organization_id, OLD.organization_id)
      AND access_scope = 'company'
      AND auto_sync_members = true
      AND archived_at IS NULL
  LOOP
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'active' AND OLD.status != 'active') THEN
      -- Add active employee to company space
      INSERT INTO public.chat_space_members (space_id, employee_id, organization_id, role, source)
      VALUES (v_space.id, NEW.id, NEW.organization_id, 'member', 'auto_sync')
      ON CONFLICT (space_id, employee_id) DO NOTHING;
      
      -- Log the addition
      INSERT INTO public.chat_space_member_logs (space_id, employee_id, organization_id, action, source, performed_by)
      VALUES (v_space.id, NEW.id, NEW.organization_id, 'added', 'auto_sync', v_space.created_by);
      
    ELSIF TG_OP = 'UPDATE' AND NEW.status != 'active' AND OLD.status = 'active' THEN
      -- Remove inactive employee from company space (only if they were auto-synced)
      DELETE FROM public.chat_space_members 
      WHERE space_id = v_space.id 
        AND employee_id = NEW.id
        AND source = 'auto_sync';
      
      -- Log the removal
      INSERT INTO public.chat_space_member_logs (space_id, employee_id, organization_id, action, source, performed_by)
      VALUES (v_space.id, NEW.id, NEW.organization_id, 'removed', 'auto_sync', v_space.created_by);
      
    ELSIF TG_OP = 'DELETE' THEN
      -- Remove deleted employee from company space
      DELETE FROM public.chat_space_members 
      WHERE space_id = v_space.id 
        AND employee_id = OLD.id;
      
      -- Log the removal
      INSERT INTO public.chat_space_member_logs (space_id, employee_id, organization_id, action, source, performed_by)
      VALUES (v_space.id, OLD.id, OLD.organization_id, 'removed', 'auto_sync', v_space.created_by);
    END IF;
  END LOOP;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Update the sync_office_space_members function to set source = 'auto_sync'
CREATE OR REPLACE FUNCTION public.sync_office_space_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space RECORD;
  v_old_office_id UUID;
  v_new_office_id UUID;
BEGIN
  v_old_office_id := CASE WHEN TG_OP != 'INSERT' THEN OLD.office_id ELSE NULL END;
  v_new_office_id := CASE WHEN TG_OP != 'DELETE' THEN NEW.office_id ELSE NULL END;
  
  -- Handle office change or employee becoming inactive
  IF TG_OP = 'UPDATE' THEN
    -- If office changed or employee became inactive, remove from old office spaces
    IF (v_old_office_id IS DISTINCT FROM v_new_office_id) OR (NEW.status != 'active' AND OLD.status = 'active') THEN
      FOR v_space IN 
        SELECT cs.id, cs.created_by
        FROM public.chat_spaces cs
        JOIN public.chat_space_offices cso ON cs.id = cso.space_id
        WHERE cso.office_id = v_old_office_id
          AND cs.access_scope = 'offices'
          AND cs.auto_sync_members = true
          AND cs.archived_at IS NULL
      LOOP
        -- Only remove if they were auto-synced
        DELETE FROM public.chat_space_members 
        WHERE space_id = v_space.id 
          AND employee_id = NEW.id
          AND source = 'auto_sync';
        
        -- Log the removal
        INSERT INTO public.chat_space_member_logs (space_id, employee_id, organization_id, action, source, performed_by)
        VALUES (v_space.id, NEW.id, NEW.organization_id, 'removed', 'auto_sync', v_space.created_by);
      END LOOP;
    END IF;
  END IF;
  
  -- Handle new office assignment or employee becoming active
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND v_new_office_id IS NOT NULL) THEN
    IF (TG_OP = 'INSERT' AND NEW.status = 'active') OR 
       (TG_OP = 'UPDATE' AND NEW.status = 'active' AND (v_old_office_id IS DISTINCT FROM v_new_office_id OR OLD.status != 'active')) THEN
      FOR v_space IN 
        SELECT cs.id, cs.organization_id, cs.created_by
        FROM public.chat_spaces cs
        JOIN public.chat_space_offices cso ON cs.id = cso.space_id
        WHERE cso.office_id = v_new_office_id
          AND cs.access_scope = 'offices'
          AND cs.auto_sync_members = true
          AND cs.archived_at IS NULL
      LOOP
        -- Add to new office space
        INSERT INTO public.chat_space_members (space_id, employee_id, organization_id, role, source)
        VALUES (v_space.id, NEW.id, NEW.organization_id, 'member', 'auto_sync')
        ON CONFLICT (space_id, employee_id) DO NOTHING;
        
        -- Log the addition
        INSERT INTO public.chat_space_member_logs (space_id, employee_id, organization_id, action, source, performed_by)
        VALUES (v_space.id, NEW.id, NEW.organization_id, 'added', 'auto_sync', v_space.created_by);
      END LOOP;
    END IF;
  END IF;
  
  -- Handle employee deletion
  IF TG_OP = 'DELETE' AND v_old_office_id IS NOT NULL THEN
    FOR v_space IN 
      SELECT cs.id, cs.created_by
      FROM public.chat_spaces cs
      JOIN public.chat_space_offices cso ON cs.id = cso.space_id
      WHERE cso.office_id = v_old_office_id
        AND cs.access_scope = 'offices'
        AND cs.auto_sync_members = true
        AND cs.archived_at IS NULL
    LOOP
      DELETE FROM public.chat_space_members 
      WHERE space_id = v_space.id 
        AND employee_id = OLD.id;
      
      -- Log the removal
      INSERT INTO public.chat_space_member_logs (space_id, employee_id, organization_id, action, source, performed_by)
      VALUES (v_space.id, OLD.id, OLD.organization_id, 'removed', 'auto_sync', v_space.created_by);
    END LOOP;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;