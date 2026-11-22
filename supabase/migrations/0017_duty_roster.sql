-- Officer duty roster: who holds which duty ("BLT", "room cleaning", "org treasurer", or anything custom), for a
-- week label or one date; neither means ongoing. Anyone reads; only officers write, like the other public tables.
create table duty_assignments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  duty text not null check (char_length(duty) between 1 and 80),
  assignee_email text not null check (assignee_email = lower(assignee_email) and char_length(assignee_email) <= 320),
  week_label text check (char_length(week_label) <= 60),
  on_date date,
  notes text check (char_length(notes) <= 500)
);
alter table duty_assignments enable row level security;
create policy read_all on duty_assignments for select using (true);
create policy officer_write on duty_assignments for all using (is_officer()) with check (is_officer());
