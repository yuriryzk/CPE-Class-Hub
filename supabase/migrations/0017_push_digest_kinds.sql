-- Digest granularity: which parts of tomorrow the daily summary includes ('classes' = weekly classes and extra
-- classes, 'quizzes_due' = quizzes/exams, due dates and the notices linked to them). Existing phones keep getting
-- everything: the default is both kinds.
alter table push_subscriptions
  add column digest_kinds text[] not null default '{classes,quizzes_due}'
  check (digest_kinds <@ array['classes', 'quizzes_due'] and cardinality(digest_kinds) > 0);

-- claim_push_digests also hands out each phone's digest kinds. The return type changes, so the function is dropped
-- and recreated; its revoke/grant are applied again below.
drop function claim_push_digests(date);
create function claim_push_digests(today date)
returns table (endpoint text, p256dh text, auth text, courses uuid[], lab_group text, digest_kinds text[], since timestamptz)
language sql security invoker set search_path = public as $$
  with due as (
    select s.endpoint, coalesce(s.last_sent_at, s.created_at) as since
    from push_subscriptions s
    where s.last_sent_at is null or (s.last_sent_at at time zone 'Asia/Manila')::date < today
    for update skip locked
  )
  update push_subscriptions p set last_sent_at = now()
  from due
  where p.endpoint = due.endpoint
  returning p.endpoint, p.p256dh, p.auth, p.courses, p.lab_group, p.digest_kinds, due.since;
$$;

revoke execute on function claim_push_digests(date) from public, anon, authenticated;
grant execute on function claim_push_digests(date) to service_role;
