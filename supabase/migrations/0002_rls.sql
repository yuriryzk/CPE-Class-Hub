create function is_officer() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from officers where email = lower(auth.jwt() ->> 'email'));
$$;

create function is_head_officer() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from officers
    where email = lower(auth.jwt() ->> 'email') and role = 'head');
$$;

alter table courses enable row level security;
alter table class_slots enable row level security;
alter table calendar_items enable row level security;
alter table notices enable row level security;
alter table files enable row level security;
alter table officers enable row level security;
alter table term enable row level security;
alter table term_breaks enable row level security;

-- Anyone reads the public tables.
create policy read_all on courses for select using (true);
create policy read_all on class_slots for select using (true);
create policy read_all on calendar_items for select using (true);
create policy read_all on notices for select using (true);
create policy read_all on files for select using (true);
create policy read_all on term for select using (true);
create policy read_all on term_breaks for select using (true);

-- Officers write. Courses: update only, and only name and code.
create policy officer_update on courses for update
  using (is_officer()) with check (is_officer());
revoke update on courses from anon, authenticated;
grant update (name, code) on courses to authenticated;

create policy officer_write on class_slots for all using (is_officer()) with check (is_officer());
create policy officer_write on calendar_items for all using (is_officer()) with check (is_officer());
create policy officer_write on notices for all using (is_officer()) with check (is_officer());
create policy officer_write on files for all using (is_officer()) with check (is_officer());
create policy officer_write on term_breaks for all using (is_officer()) with check (is_officer());
create policy officer_update on term for update using (is_officer()) with check (is_officer());

-- Officers: own row for everyone; the head reads all, adds, and removes others.
create policy read_own on officers for select
  using (email = lower(auth.jwt() ->> 'email') or is_head_officer());
create policy head_insert on officers for insert with check (is_head_officer());
create policy head_delete on officers for delete
  using (is_head_officer() and email <> lower(auth.jwt() ->> 'email'));
