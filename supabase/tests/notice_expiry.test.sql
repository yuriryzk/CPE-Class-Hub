begin;
select plan(3);

-- Setup as superuser: an officer and a course to post under.
insert into officers (email, role) values ('officer@test.local', 'officer');
create temp table ctx as
  select (select id from courses where code = 'PM') as course_id;
grant select on ctx to authenticated;

set local role authenticated;
set local request.jwt.claims = '{"email":"officer@test.local"}';

select lives_ok(
  $$insert into notices (course_id, title, body, posted_on, expires_on)
    values ((select course_id from ctx), 'Permission slip', 'Bring it Friday.', current_date, current_date + 7)$$,
  'an officer can set an expiry date');
select is(
  (select expires_on from notices where title = 'Permission slip'),
  current_date + 7,
  'the expiry date is stored');
select throws_ok(
  $$insert into notices (course_id, title, body, posted_on, expires_on)
    values ((select course_id from ctx), 'Bad date', 'b', current_date, 'not-a-date')$$,
  '22007', null, 'a non-date expiry is refused');

select * from finish();
rollback;
