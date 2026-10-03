create extension if not exists pgcrypto;

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  contact_person text,
  phone text,
  site_url text,
  price numeric(12, 2) not null default 0 check (price >= 0),
  paid_amount numeric(12, 2) not null default 0 check (paid_amount >= 0),
  payment_status text generated always as (
    case
      when price > 0 and paid_amount >= price then 'paid'
      when paid_amount > 0 then 'partial'
      else 'unpaid'
    end
  ) stored,
  project_status text not null default 'in_progress'
    check (project_status in ('in_progress', 'on_hold', 'done')),
  deadline date,
  note text
);

create index clients_project_status_idx on public.clients (project_status);
create index clients_created_at_idx on public.clients (created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clients_set_updated_at
  before update on public.clients
  for each row
  execute function public.set_updated_at();

alter table public.clients enable row level security;

create policy "authenticated read clients"
  on public.clients for select to authenticated using (true);

create policy "authenticated insert clients"
  on public.clients for insert to authenticated with check (true);

create policy "authenticated update clients"
  on public.clients for update to authenticated using (true) with check (true);

create policy "authenticated delete clients"
  on public.clients for delete to authenticated using (true);
