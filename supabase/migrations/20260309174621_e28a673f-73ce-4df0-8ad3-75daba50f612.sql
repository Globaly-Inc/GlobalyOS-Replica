create table public.task_saved_filters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  space_id uuid references public.task_spaces(id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.task_saved_filters enable row level security;

create policy "Users manage own saved filters"
  on public.task_saved_filters
  for all
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());