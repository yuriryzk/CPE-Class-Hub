-- Renames courses in ONE statement, so a failure (such as a duplicate code) changes none of them.
-- security invoker: RLS (officers only) and the name/code column grant still apply to the caller.
create function save_courses(rows jsonb) returns void
language sql security invoker set search_path = public as $$
  update courses c set name = v.name, code = v.code
  from jsonb_to_recordset(rows) as v(id uuid, name text, code text)
  where c.id = v.id;
$$;

revoke execute on function save_courses(jsonb) from public;
grant execute on function save_courses(jsonb) to authenticated;
