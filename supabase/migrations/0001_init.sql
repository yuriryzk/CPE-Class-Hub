create type item_kind as enum ('quiz_exam', 'due', 'no_class', 'extra_class');
create type officer_role as enum ('head', 'officer');

create table courses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  slot smallint not null unique check (slot between 1 and 9),
  name text not null check (char_length(name) between 1 and 80),
  code text not null check (code ~ '^[A-Za-z0-9-]{1,8}$'),
  color text not null
);
create unique index courses_code_lower_key on courses (lower(code));

create table class_slots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  course_id uuid not null references courses on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  starts_at time not null,
  ends_at time not null,
  room text check (char_length(room) <= 40),
  lab_group text not null default '' check (lab_group in ('', 'G1', 'G2')),
  check (ends_at > starts_at)
);

create table calendar_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  course_id uuid not null references courses on delete cascade,
  kind item_kind not null,
  title text not null check (char_length(title) between 1 and 120),
  on_date date not null,
  at_time time,
  notes text check (char_length(notes) <= 2000),
  moved_from_date date,
  moved_from_time time,
  class_slot_id uuid references class_slots on delete cascade,
  check (class_slot_id is null or kind = 'no_class')
);

create table notices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  course_id uuid not null references courses on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 4000),
  posted_on date not null,
  pinned boolean not null default false,
  done boolean not null default false,
  calendar_item_id uuid unique references calendar_items on delete set null,
  created_by text
);

create table files (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  course_id uuid references courses on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  file_type text not null check (char_length(file_type) <= 30),
  week_label text,
  url text check (url is null or url like 'https://%'),
  storage_path text,
  size_bytes bigint,
  mime_type text,
  check ((url is null) <> (storage_path is null))
);

create table officers (
  email text primary key check (email = lower(email)),
  role officer_role not null,
  added_by text
);

create table term (
  id boolean primary key default true check (id),
  starts_on date not null check (extract(dow from starts_on) = 0),
  week_count smallint not null check (week_count > 0)
);

create table term_breaks (
  starts_on date primary key check (extract(dow from starts_on) = 0),
  label text not null
);
