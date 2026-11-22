begin;
select plan(7);

-- Setup as superuser: two test officers and one duty.
insert into officers (email, role) values
  ('head@test.local', 'head'),
  ('officer@test.local', 'officer');
delete from duty_assignments; -- seed.sql adds some; this test counts its own
insert into duty_assignments (duty, assignee_email, week_label) values
  ('BLT', 'officer@test.local', 'Week 1');

-- anon: reads, cannot write
set local role anon;
select is((select count(*)::int from duty_assignments), 1, 'anon reads the roster');
select throws_ok(
  $$insert into duty_assignments (duty, assignee_email) values ('x', 'a@b.c')$$,
  '42501', null, 'anon cannot add a duty');

-- authenticated but not an officer: reads, cannot write
set local role authenticated;
set local request.jwt.claims = '{"email":"nobody@example.com"}';
select is((select count(*)::int from duty_assignments), 1, 'anyone signed in reads the roster');
select throws_ok(
  $$insert into duty_assignments (duty, assignee_email) values ('x', 'a@b.c')$$,
  '42501', null, 'non-officer cannot add a duty');

-- officer: full write (email match is case-insensitive)
set local request.jwt.claims = '{"email":"Officer@Test.local"}';
select lives_ok(
  $$insert into duty_assignments (duty, assignee_email, on_date) values ('Cleaning', 'officer@test.local', '2026-11-20')$$,
  'officer adds a duty');
select lives_ok(
  $$update duty_assignments set notes = 'bring gloves' where duty = 'BLT'$$,
  'officer edits a duty');
select lives_ok(
  $$delete from duty_assignments where duty = 'Cleaning'$$,
  'officer deletes a duty');

select * from finish();
rollback;
