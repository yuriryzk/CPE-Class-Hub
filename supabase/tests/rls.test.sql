begin;
select plan(16);

-- Setup as superuser: two test officers.
insert into officers (email, role) values
  ('head@test.local', 'head'),
  ('officer@test.local', 'officer');

create temp table ctx as
  select (select id from courses where code = 'PM') as course_id;
grant select on ctx to anon, authenticated;

-- anon
set local role anon;
select is((select count(*)::int from courses), 9, 'anon reads nine courses');
select throws_ok(
  $$insert into notices (course_id, title, body, posted_on) values ((select course_id from ctx), 't', 'b', current_date)$$,
  '42501', null, 'anon cannot insert notices');
select is((select count(*)::int from officers), 0, 'anon sees no officers');

-- authenticated but not an officer
set local role authenticated;
set local request.jwt.claims = '{"email":"nobody@example.com"}';
select throws_ok(
  $$insert into notices (course_id, title, body, posted_on) values ((select course_id from ctx), 't', 'b', current_date)$$,
  '42501', null, 'non-officer cannot insert notices');

-- officer
set local request.jwt.claims = '{"email":"Officer@Test.local"}';
select lives_ok(
  $$insert into notices (course_id, title, body, posted_on) values ((select course_id from ctx), 't', 'b', current_date)$$,
  'officer inserts a notice (email match is case-insensitive)');
select lives_ok($$update term set week_count = 18$$, 'officer updates term');
select lives_ok($$insert into term_breaks (starts_on, label) values ('2027-01-03', 'Test break')$$, 'officer inserts a break');
select is((select count(*)::int from officers), 1, 'officer reads only own officers row');
select throws_ok(
  $$insert into officers (email, role) values ('x@test.local', 'officer')$$,
  '42501', null, 'officer cannot insert officers');

-- constraints (as officer)
select throws_ok(
  $$insert into files (title, file_type, url) values ('x', 'Link', 'javascript:alert(1)')$$,
  '23514', null, 'javascript: file link refused');
reset role; -- officers have no courses insert policy, so check the constraint as superuser
select throws_ok(
  $$insert into courses (slot, name, code, color) values (1, 'n', 'TOOLONGCODE', '#000')$$,
  '23514', null, 'course code over 8 characters refused');

-- one notice per calendar item
set local role authenticated;
select lives_ok(
  $$insert into calendar_items (course_id, kind, title, on_date) values ((select course_id from ctx), 'due', 'item', current_date)$$,
  'officer inserts a calendar item');
select lives_ok(
  $$insert into notices (course_id, title, body, posted_on, calendar_item_id)
    select course_id, 'a', 'b', current_date, (select id from calendar_items limit 1) from ctx$$,
  'first notice linked to item');
select throws_ok(
  $$insert into notices (course_id, title, body, posted_on, calendar_item_id)
    select course_id, 'a', 'b', current_date, (select id from calendar_items limit 1) from ctx$$,
  '23505', null, 'second notice for same item refused');

-- head officer
set local request.jwt.claims = '{"email":"head@test.local"}';
select lives_ok($$insert into officers (email, role) values ('new@test.local', 'officer')$$, 'head inserts an officer');
delete from officers where email = 'head@test.local';
select is((select count(*)::int from officers where email = 'head@test.local'), 1, 'head cannot delete own row');

select * from finish();
rollback;
