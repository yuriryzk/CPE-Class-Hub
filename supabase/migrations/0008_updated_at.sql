-- When each row last changed, for the footer's "Updated" time. The database sets it on every insert and update.
create function touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['courses', 'class_slots', 'calendar_items', 'notices', 'files'] loop
    execute format('alter table %I add column updated_at timestamptz', t);
    execute format('update %I set updated_at = created_at', t); -- existing rows: last change = when added
    execute format('alter table %I alter column updated_at set default now(), alter column updated_at set not null', t);
    execute format('create trigger touch_updated_at before update on %I for each row execute function touch_updated_at()', t);
  end loop;
end $$;
