-- Semester archive: starting a new semester no longer wipes the old one. The outgoing term's dates and breaks are
-- snapshotted into archived_semesters, its courses are marked with archived_in (their slots, one-day changes,
-- calendar items, notices, files and reports stay attached and readable under /archive), and nine fresh courses
-- take their place. General files (no course) stay on the live site, as before.
create table archived_semesters (
  id uuid primary key default gen_random_uuid(),
  archived_at timestamptz not null default now(),
  starts_on date not null,
  week_count smallint not null check (week_count > 0),
  breaks jsonb not null default '[]'::jsonb check (jsonb_typeof(breaks) = 'array')
);
alter table archived_semesters enable row level security;
create policy read_all on archived_semesters for select using (true);

alter table courses add column archived_in uuid references archived_semesters (id);

-- Slot and code stay unique, but only across the live courses: an archived course keeps its slot and code for the
-- archive while the new semester's copies reuse them.
alter table courses drop constraint courses_slot_key;
drop index courses_code_lower_key;
create unique index courses_slot_key on courses (slot) where archived_in is null;
create unique index courses_code_lower_key on courses (lower(code)) where archived_in is null;

-- Officers can no longer change archived rows: every write policy now requires the row's course to be live
-- (files may have no course; slot_groups reach their course through the weekly class).
drop policy officer_update on courses;
create policy officer_update on courses for update
  using (is_officer() and archived_in is null) with check (is_officer() and archived_in is null);

drop policy officer_write on class_slots;
create policy officer_write on class_slots for all
  using (is_officer() and exists (select 1 from courses where courses.id = class_slots.course_id and courses.archived_in is null))
  with check (is_officer() and exists (select 1 from courses where courses.id = class_slots.course_id and courses.archived_in is null));

drop policy officer_write on calendar_items;
create policy officer_write on calendar_items for all
  using (is_officer() and exists (select 1 from courses where courses.id = calendar_items.course_id and courses.archived_in is null))
  with check (is_officer() and exists (select 1 from courses where courses.id = calendar_items.course_id and courses.archived_in is null));

drop policy officer_write on notices;
create policy officer_write on notices for all
  using (is_officer() and exists (select 1 from courses where courses.id = notices.course_id and courses.archived_in is null))
  with check (is_officer() and exists (select 1 from courses where courses.id = notices.course_id and courses.archived_in is null));

drop policy officer_write on files;
create policy officer_write on files for all
  using (is_officer() and (files.course_id is null or exists (select 1 from courses where courses.id = files.course_id and courses.archived_in is null)))
  with check (is_officer() and (files.course_id is null or exists (select 1 from courses where courses.id = files.course_id and courses.archived_in is null)));

drop policy officer_write on slot_groups;
create policy officer_write on slot_groups for all
  using (is_officer() and exists (select 1 from class_slots join courses on courses.id = class_slots.course_id
    where class_slots.id = slot_groups.slot_id and courses.archived_in is null))
  with check (is_officer() and exists (select 1 from class_slots join courses on courses.id = class_slots.course_id
    where class_slots.id = slot_groups.slot_id and courses.archived_in is null));

-- Starts the next semester in one step (head officer only): the current dates and breaks move to
-- archived_semesters, every live course is marked archived (keeping its slots, one-day changes, calendar items,
-- notices, files and reports for the archive), the term gets the new dates with no breaks, and the nine courses
-- are replaced by fresh copies keeping their slot, name, code and colour. The new ids mean saved course picks on
-- phones match nothing, and the daily summaries go back to every course.
-- security definer: push_subscriptions is closed to officers, and courses only grant some columns; the head check
-- comes first. Every delete and update says `where true`, since the API refuses statements without a WHERE.
create or replace function start_semester(new_start date, new_weeks int) returns void
language plpgsql security definer set search_path = public as $$
declare
  kept jsonb;
  sem uuid;
begin
  if not is_head_officer() then
    raise exception 'Only the head officer can start a semester' using errcode = '42501';
  end if;
  if new_start <= (select starts_on from term) then
    raise exception 'The new semester must start after the current one';
  end if;
  -- The copy list is read before archiving, while the courses are still live.
  select jsonb_agg(jsonb_build_object('slot', slot, 'name', name, 'code', code, 'color', color))
    into kept from courses where archived_in is null;
  insert into archived_semesters (starts_on, week_count, breaks)
    select t.starts_on, t.week_count,
      coalesce((select jsonb_agg(jsonb_build_object('starts_on', b.starts_on, 'label', b.label) order by b.starts_on)
        from term_breaks b), '[]'::jsonb)
    from term t
    returning id into sem;
  update courses set archived_in = sem where archived_in is null;
  update term set starts_on = new_start, week_count = new_weeks where true;
  delete from term_breaks where true;
  insert into courses (slot, name, code, color)
    select slot, name, code, color from jsonb_to_recordset(kept) as x(slot smallint, name text, code text, color text);
  update push_subscriptions set courses = '{}' where true;
end;
$$;
