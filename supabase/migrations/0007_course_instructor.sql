-- One instructor name per course, set on Admin → Courses; shown only in a class's or item's details.
alter table courses add column instructor text not null default '' check (char_length(instructor) <= 80);
grant update (instructor) on courses to authenticated;

-- Same one-statement save, now with the instructor. A row without one keeps the stored name.
create or replace function save_courses(rows jsonb) returns void
language sql security invoker set search_path = public as $$
  update courses c set name = v.name, code = v.code, instructor = coalesce(v.instructor, c.instructor)
  from jsonb_to_recordset(rows) as v(id uuid, name text, code text, instructor text)
  where c.id = v.id;
$$;
