-- Short notes and links per course (past exams, formula sheets, reviewer links, recorded lectures). Same
-- permissions as files: everyone reads, only officers write. course_id cascades, so a new semester clears them.
create table course_notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  course_id uuid not null references courses on delete cascade,
  kind text not null check (kind in ('note', 'link')),
  title text not null check (char_length(title) between 1 and 120),
  body text check (body is null or char_length(body) between 1 and 2000),
  url text check (url is null or url like 'https://%'),
  created_by text,
  -- A note has text and no link; a link has a URL and no text. The two checks also null out the other field.
  check ((kind = 'note') = (body is not null)),
  check ((kind = 'link') = (url is not null))
);
alter table course_notes enable row level security;
create policy read_all on course_notes for select using (true);
create policy officer_write on course_notes for all using (is_officer()) with check (is_officer());
