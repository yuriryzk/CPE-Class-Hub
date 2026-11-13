-- The school's course number (for example "CPE 308"), set on Admin → Courses; shown only in a class's or item's details.
alter table courses add column course_no text not null default '' check (char_length(course_no) <= 20);
grant update (course_no) on courses to authenticated;

-- Same one-statement save, now with the course number. A row without one keeps the stored value.
create or replace function save_courses(rows jsonb) returns void
language sql security invoker set search_path = public as $$
  update courses c set name = v.name, code = v.code,
    instructor = coalesce(v.instructor, c.instructor), course_no = coalesce(v.course_no, c.course_no)
  from jsonb_to_recordset(rows) as v(id uuid, name text, code text, instructor text, course_no text)
  where c.id = v.id;
$$;
