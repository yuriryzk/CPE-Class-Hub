begin;
select plan(31);

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
select throws_ok(
  $$select save_courses((select jsonb_agg(jsonb_build_object('id', id, 'name', 'x', 'code', code)) from courses))$$,
  '42501', null, 'anon cannot use save_courses');

-- authenticated but not an officer
set local role authenticated;
set local request.jwt.claims = '{"email":"nobody@example.com"}';
select throws_ok(
  $$insert into notices (course_id, title, body, posted_on) values ((select course_id from ctx), 't', 'b', current_date)$$,
  '42501', null, 'non-officer cannot insert notices');

-- non-officer cannot change term (RLS filters the row silently)
update term set week_count = 5;
select is((select week_count from term), 18::smallint, 'non-officer update of term changes nothing');

-- officer
set local request.jwt.claims = '{"email":"Officer@Test.local"}';
select lives_ok(
  $$insert into notices (course_id, title, body, posted_on) values ((select course_id from ctx), 't', 'b', current_date)$$,
  'officer inserts a notice (email match is case-insensitive)');
update term set week_count = 17;
select is((select week_count from term), 17::smallint, 'officer updates term');
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
    select course_id, 'a', 'b', current_date, (select id from calendar_items where title = 'item') from ctx$$,
  'first notice linked to item');
select throws_ok(
  $$insert into notices (course_id, title, body, posted_on, calendar_item_id)
    select course_id, 'a', 'b', current_date, (select id from calendar_items where title = 'item') from ctx$$,
  '23505', null, 'second notice for same item refused');

-- save_courses: all-or-nothing. Swapping two codes trips the unique index, and neither changes.
select throws_ok(
  $$select save_courses((select jsonb_agg(jsonb_build_object('id', id, 'name', name,
    'code', case code when 'PM' then 'CNS' when 'CNS' then 'PM' else code end)) from courses))$$,
  '23505', null, 'swapping two course codes is refused');
select is((select string_agg(code, ',' order by slot) from courses where code in ('PM', 'CNS')), 'PM,CNS', 'a refused save leaves both codes unchanged');

-- save_courses also sets the instructor and course no.; a row without them keeps them.
select lives_ok(
  $$select save_courses(jsonb_build_array(jsonb_build_object('id', (select course_id from ctx), 'name', 'Project Management', 'code', 'PM', 'instructor', 'Engr. Cruz', 'course_no', 'CPE 308')))$$,
  'officer sets an instructor and course no.');
select save_courses(jsonb_build_array(jsonb_build_object('id', (select course_id from ctx), 'name', 'Project Management', 'code', 'PM')));
select is((select instructor from courses where code = 'PM'), 'Engr. Cruz', 'a save without the instructor keeps it');
select is((select course_no from courses where code = 'PM'), 'CPE 308', 'a save without the course no. keeps it');

-- updated_at: an edit moves it past when the row was added (the footer's "Updated" time)
update files set title = title || ' (edited)' where course_id is null;
select ok((select bool_and(updated_at > created_at) from files where course_id is null), 'editing a row bumps updated_at');

-- one cancel per class per day
select has_index('calendar_items', 'calendar_items_slot_day_key', 'a class is cancelled at most once per day');

-- head officer
set local request.jwt.claims = '{"email":"head@test.local"}';
select lives_ok($$insert into officers (email, role) values ('new@test.local', 'officer')$$, 'head inserts an officer');
delete from officers where email = 'head@test.local';
select is((select count(*)::int from officers where email = 'head@test.local'), 1, 'head cannot delete own row');

-- push_subscriptions: only the server's service role reads or writes them; the daily claim hands each phone out once a day
reset role;
insert into push_subscriptions (endpoint, p256dh, auth) values ('https://push.test/a', 'k', 'a');
create temp table manila as select (now() at time zone 'Asia/Manila')::date as today;
grant select on manila to anon, authenticated, service_role;
set local role anon;
select throws_ok($$select count(*) from push_subscriptions$$, '42501', null, 'anon cannot read push subscriptions');
select throws_ok($$insert into push_subscriptions (endpoint, p256dh, auth) values ('https://push.test/b', 'k', 'a')$$,
  '42501', null, 'anon cannot add push subscriptions directly');
select throws_ok($$select * from claim_push_digests(current_date)$$, '42501', null, 'anon cannot run the daily claim');
set local role authenticated;
set local request.jwt.claims = '{"email":"officer@test.local"}';
select throws_ok($$select count(*) from push_subscriptions$$, '42501', null, 'officers cannot read push subscriptions');
set local role service_role;
select is((select count(*)::int from claim_push_digests((select today from manila))), 1, 'the first run of the day claims the phone');
select is((select count(*)::int from claim_push_digests((select today from manila))), 0, 'a second run the same day claims nothing');
reset role;

select * from finish();
rollback;
