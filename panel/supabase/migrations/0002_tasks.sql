create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  description text,
  assignee text not null check (assignee in ('owner', 'partner', 'agent')),
  priority text not null default 'normal' check (priority in ('high', 'normal', 'low')),
  status text not null default 'new' check (status in ('new', 'in_progress', 'done')),
  created_by text not null default 'human' check (created_by in ('human', 'agent'))
);

create index tasks_assignee_idx on public.tasks (assignee);
create index tasks_status_idx on public.tasks (status);
create index tasks_created_at_idx on public.tasks (created_at desc);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row
  execute function public.set_updated_at();

alter table public.tasks enable row level security;

create policy "authenticated read tasks"
  on public.tasks for select to authenticated using (true);

create policy "authenticated insert tasks"
  on public.tasks for insert to authenticated with check (true);

create policy "authenticated update tasks"
  on public.tasks for update to authenticated using (true) with check (true);

create policy "authenticated delete tasks"
  on public.tasks for delete to authenticated using (true);
