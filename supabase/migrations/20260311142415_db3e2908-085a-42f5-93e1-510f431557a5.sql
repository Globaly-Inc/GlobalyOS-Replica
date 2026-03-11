
CREATE TABLE public.task_list_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  list_id uuid NOT NULL REFERENCES public.task_lists(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, list_id)
);

ALTER TABLE public.task_list_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own list favorites"
  ON public.task_list_favorites FOR SELECT TO authenticated
  USING (employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own list favorites"
  ON public.task_list_favorites FOR INSERT TO authenticated
  WITH CHECK (employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own list favorites"
  ON public.task_list_favorites FOR DELETE TO authenticated
  USING (employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  ));
