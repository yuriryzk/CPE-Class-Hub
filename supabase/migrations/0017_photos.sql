-- The photo wall: pictures from trips, intrams and meetings, kept as links (like files: no uploads yet).
-- Anyone reads; officers add, edit and delete, same as files.
create table photos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null check (char_length(title) between 1 and 120),
  album text not null check (char_length(album) between 1 and 60), -- the event, e.g. 'Intrams 2026'
  taken_on date,
  url text not null check (url like 'https://%')
);
alter table photos enable row level security;
create policy read_all on photos for select using (true);
create policy officer_write on photos for all using (is_officer()) with check (is_officer());
create trigger touch_updated_at before update on photos for each row execute function touch_updated_at();
