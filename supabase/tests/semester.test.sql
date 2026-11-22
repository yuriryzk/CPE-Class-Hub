begin;
select plan(28);

-- Setup as superuser: officers, a phone's push picks, a General file and a one-day change, so the archive has them to keep.
insert into officers (email, role) values ('head@test.local', 'head'), ('officer@test.local', 'officer');
insert into push_subscriptions (endpoint, p256dh, auth, courses) values
  ('https://push.test/1', 'k', 'a', array[(select id from courses where code = 'PM')]);
insert into files (course_id, title, file_type, url) values (null, 'Class list', 'Sheet', 'https://example.com/list');
insert into slot_groups (slot_id, on_date, lab_group) values ((select id from class_slots limit 1), '2026-11-17', 'G1');
create temp table before as select id, slot, name, code, color from courses;
create temp table n as
  select (select count(*) from class_slots)::int as slots,
    (select count(*) from calendar_items)::int as items,
    (select count(*) from notices)::int as notices,
    (select count(*) from files where course_id is not null)::int as course_files,
    (select count(*) from files where course_id is null)::int as general;
grant select on before, n to authenticated;

set local role authenticated;

-- An officer who is not the head cannot start a semester.
set local request.jwt.claims = '{"email":"officer@test.local"}';
select throws_ok($$select start_semester('2027-01-17', 18)$$, '42501', null, 'an officer who is not the head is refused');

set local request.jwt.claims = '{"email":"head@test.local"}';
-- The new semester must start after the current one, so a typo or a second tap cannot archive the term again.
select throws_ok($$select start_semester('2026-11-15', 18)$$, 'P0001', 'The new semester must start after the current one',
  'the same start date is refused');
select throws_ok($$select start_semester('2027-01-18', 18)$$, '23514', null, 'a start that is not a Sunday is refused');
select ok((select slots from n) > 0 and (select count(*)::int from class_slots) = (select slots from n), 'nothing was archived by a refused start');

select lives_ok($$select start_semester('2027-01-17', 18)$$, 'the head officer starts the next semester');
select results_eq('select starts_on, week_count::int from term', $$values ('2027-01-17'::date, 18)$$, 'the term has the new dates');
select is((select count(*)::int from term_breaks), 0, 'the live breaks are gone');

-- The old semester is archived, read-only, with its dates and breaks.
select is((select count(*)::int from archived_semesters), 1, 'one archived semester');
select results_eq('select starts_on, week_count::int from archived_semesters', $$values ('2026-11-15'::date, 18)$$,
  'the archive keeps the old dates');
select ok((select breaks @> '[{"label":"Christmas break"}]'::jsonb from archived_semesters), 'the archive keeps the breaks');

-- Live courses: nine fresh copies; archived courses keep the old rows and ids.
select is((select count(*)::int from courses where archived_in is null), 9, 'nine live courses');
select is((select count(*)::int from courses where archived_in is not null), 9, 'nine archived courses');
select results_eq('select slot, name, code, color from courses where archived_in is null order by slot',
  'select slot, name, code, color from before order by slot', 'each live course keeps its slot, name, code and colour');
select is((select count(*)::int from courses c join before b using (id) where c.archived_in is null), 0,
  'every live course has a new id, so old saved picks match none');
select is((select count(*)::int from courses c join before b using (id) where c.archived_in is not null), 9,
  'the archived courses keep their old ids');
select is((select count(*)::int from courses where archived_in is null and (instructor <> '' or course_no <> '')), 0,
  'live instructors and course nos. are cleared');

-- Live data is empty; the archived courses keep theirs.
select is((select count(*)::int from class_slots s join courses c on c.id = s.course_id where c.archived_in is null), 0, 'live weekly classes are gone');
select is((select count(*)::int from calendar_items i join courses c on c.id = i.course_id where c.archived_in is null), 0, 'live calendar items are gone');
select is((select count(*)::int from notices x join courses c on c.id = x.course_id where c.archived_in is null), 0, 'live notices are gone');
select is((select count(*)::int from files f join courses c on c.id = f.course_id where c.archived_in is null), 0, 'live course files are gone');
select is((select count(*)::int from class_slots s join courses c on c.id = s.course_id where c.archived_in is not null), (select slots from n),
  'the archive keeps the weekly classes');
select is((select count(*)::int from calendar_items i join courses c on c.id = i.course_id where c.archived_in is not null), (select items from n),
  'the archive keeps the calendar items');
select is((select count(*)::int from notices x join courses c on c.id = x.course_id where c.archived_in is not null), (select notices from n),
  'the archive keeps the notices');
select is((select count(*)::int from files f join courses c on c.id = f.course_id where c.archived_in is not null), (select course_files from n),
  'the archive keeps the course files');
select is((select count(*)::int from files where course_id is null), (select general from n), 'General files stay');

-- Archived rows are read-only for officers: writes match nothing, inserts are refused.
update class_slots set room = 'HACKED' where course_id in (select id from courses where archived_in is not null);
select is((select count(*)::int from class_slots where room = 'HACKED'), 0, 'an officer cannot change an archived class');
select throws_ok(
  $$insert into class_slots (course_id, weekday, starts_at, ends_at) select id, 1, '08:00', '09:00' from courses where archived_in is not null limit 1$$,
  '42501', null, 'an officer cannot add a class to an archived course');
reset role;
select is((select courses from push_subscriptions where endpoint = 'https://push.test/1'), '{}'::uuid[],
  'phones'' daily summaries go back to every course');

select * from finish();
rollback;
