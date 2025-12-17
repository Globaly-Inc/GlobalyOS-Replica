-- Create kpi_updates table for tracking progress updates
CREATE TABLE public.kpi_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kpi_id UUID NOT NULL REFERENCES public.kpis(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  previous_value NUMERIC,
  new_value NUMERIC,
  notes TEXT NOT NULL,
  status_before TEXT,
  status_after TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create kpi_update_settings table for auto-reminder configuration
CREATE TABLE public.kpi_update_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kpi_id UUID NOT NULL REFERENCES public.kpis(id) ON DELETE CASCADE UNIQUE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 28),
  reminder_time TIME NOT NULL DEFAULT '09:00:00',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  last_reminder_at TIMESTAMP WITH TIME ZONE,
  next_reminder_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_kpi_updates_kpi_id ON public.kpi_updates(kpi_id);
CREATE INDEX idx_kpi_updates_organization_id ON public.kpi_updates(organization_id);
CREATE INDEX idx_kpi_updates_created_at ON public.kpi_updates(created_at DESC);
CREATE INDEX idx_kpi_update_settings_next_reminder ON public.kpi_update_settings(next_reminder_at) WHERE is_enabled = true;
CREATE INDEX idx_kpi_update_settings_organization_id ON public.kpi_update_settings(organization_id);

-- Enable RLS
ALTER TABLE public.kpi_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_update_settings ENABLE ROW LEVEL SECURITY;

-- Enable realtime for kpi_updates
ALTER TABLE public.kpi_updates REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kpi_updates;

-- RLS Policies for kpi_updates

-- View: Users in same org can view updates for KPIs they can access
CREATE POLICY "Users can view KPI updates in their org"
ON public.kpi_updates
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = auth.uid()
    AND e.organization_id = kpi_updates.organization_id
  )
);

-- Insert: Users can add updates to KPIs they own or manage
CREATE POLICY "Users can add updates to accessible KPIs"
ON public.kpi_updates
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.kpis k
    JOIN public.employees e ON e.user_id = auth.uid()
    WHERE k.id = kpi_updates.kpi_id
    AND k.organization_id = kpi_updates.organization_id
    AND e.organization_id = kpi_updates.organization_id
    AND (
      -- Own KPI
      k.employee_id = e.id
      -- Or admin/HR/owner
      OR has_role(auth.uid(), 'owner')
      OR has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'hr')
      -- Or manager of KPI owner
      OR EXISTS (
        SELECT 1 FROM public.employees target
        WHERE target.id = k.employee_id
        AND target.manager_id = e.id
      )
      -- Or group KPI member
      OR (k.scope_type != 'individual' AND (
        (k.scope_type = 'department' AND k.scope_department = e.department)
        OR (k.scope_type = 'office' AND k.scope_office_id = e.office_id)
        OR (k.scope_type = 'project' AND EXISTS (
          SELECT 1 FROM public.employee_projects ep
          WHERE ep.employee_id = e.id
          AND ep.project_id = k.scope_project_id
        ))
      ))
    )
  )
);

-- Delete: Only author within 24h or admin
CREATE POLICY "Authors can delete own updates within 24h"
ON public.kpi_updates
FOR DELETE
TO authenticated
USING (
  (
    employee_id = (SELECT id FROM public.employees WHERE user_id = auth.uid() LIMIT 1)
    AND created_at > (now() - INTERVAL '24 hours')
  )
  OR has_role(auth.uid(), 'owner')
  OR has_role(auth.uid(), 'admin')
);

-- RLS Policies for kpi_update_settings

-- View: Users in same org can view settings
CREATE POLICY "Users can view KPI update settings in their org"
ON public.kpi_update_settings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = auth.uid()
    AND e.organization_id = kpi_update_settings.organization_id
  )
);

-- Insert: KPI owner, managers, or admin can create settings
CREATE POLICY "KPI stakeholders can create update settings"
ON public.kpi_update_settings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.kpis k
    JOIN public.employees e ON e.user_id = auth.uid()
    WHERE k.id = kpi_update_settings.kpi_id
    AND k.organization_id = kpi_update_settings.organization_id
    AND e.organization_id = kpi_update_settings.organization_id
    AND (
      k.employee_id = e.id
      OR has_role(auth.uid(), 'owner')
      OR has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'hr')
    )
  )
);

-- Update: Same as insert
CREATE POLICY "KPI stakeholders can update settings"
ON public.kpi_update_settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.kpis k
    JOIN public.employees e ON e.user_id = auth.uid()
    WHERE k.id = kpi_update_settings.kpi_id
    AND k.organization_id = kpi_update_settings.organization_id
    AND e.organization_id = kpi_update_settings.organization_id
    AND (
      k.employee_id = e.id
      OR has_role(auth.uid(), 'owner')
      OR has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'hr')
    )
  )
);

-- Delete: Same as insert
CREATE POLICY "KPI stakeholders can delete settings"
ON public.kpi_update_settings
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.kpis k
    JOIN public.employees e ON e.user_id = auth.uid()
    WHERE k.id = kpi_update_settings.kpi_id
    AND k.organization_id = kpi_update_settings.organization_id
    AND e.organization_id = kpi_update_settings.organization_id
    AND (
      k.employee_id = e.id
      OR has_role(auth.uid(), 'owner')
      OR has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'hr')
    )
  )
);

-- Trigger to update kpis table when update is added
CREATE OR REPLACE FUNCTION public.update_kpi_on_progress_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.kpis
  SET current_value = NEW.new_value,
      status = NEW.status_after,
      updated_at = now()
  WHERE id = NEW.kpi_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_kpi_update_added
AFTER INSERT ON public.kpi_updates
FOR EACH ROW
EXECUTE FUNCTION public.update_kpi_on_progress_update();

-- Trigger to create notification when reminder is due
CREATE OR REPLACE FUNCTION public.notify_kpi_update_due()
RETURNS TRIGGER AS $$
DECLARE
  _kpi RECORD;
  _employee RECORD;
BEGIN
  -- Get KPI details
  SELECT * INTO _kpi FROM public.kpis WHERE id = NEW.kpi_id;
  
  IF _kpi.employee_id IS NOT NULL THEN
    -- Individual KPI - notify the owner
    SELECT e.id, e.user_id INTO _employee
    FROM public.employees e
    WHERE e.id = _kpi.employee_id;
    
    IF _employee IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id,
        organization_id,
        type,
        title,
        message,
        reference_type,
        reference_id
      ) VALUES (
        _employee.user_id,
        _kpi.organization_id,
        'kpi_update_due',
        'KPI Update Reminder',
        'Time to update your KPI: ' || _kpi.title,
        'kpi',
        _kpi.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;