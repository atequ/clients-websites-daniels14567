-- The next thing to do for a client and when, so follow-ups don't get forgotten.
alter table public.clients
  add column next_step text,
  add column next_step_date date;

create index clients_next_step_date_idx on public.clients (next_step_date);
