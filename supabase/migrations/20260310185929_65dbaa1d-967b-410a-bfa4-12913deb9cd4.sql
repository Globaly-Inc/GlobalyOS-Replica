
CREATE TABLE public.task_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, task_id)
);

ALTER TABLE public.task_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own task favorites"
  ON public.task_favorites FOR SELECT
  TO authenticated
  USING (employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own task favorites"
  ON public.task_favorites FOR INSERT
  TO authenticated
  WITH CHECK (employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own task favorites"
  ON public.task_favorites FOR DELETE
  TO authenticated
  USING (employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  ));
