-- Phase 3: phones that opted in to the daily push summary. Anonymous: only the browser's push address and keys,
-- plus the courses (empty = all) and lab group ('' = both) the classmate picked.
create table push_subscriptions (
  endpoint text primary key check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) between 1 and 200),
  auth text not null check (char_length(auth) between 1 and 100),
  courses uuid[] not null default '{}',
  lab_group text not null default '' check (lab_group in ('', 'G1', 'G2')),
  created_at timestamptz not null default now(),
  last_sent_at timestamptz -- when its last daily summary was claimed
);

-- No policies and no grants: visitors and officers can neither read nor write it. Only the server's service role
-- (subscribe/unsubscribe actions and the daily job) can.
alter table push_subscriptions enable row level security;
revoke all on push_subscriptions from anon, authenticated;

-- Claims today's summary (Manila date) for every phone not sent one yet today, in one statement, so a second or
-- overlapping run of the daily job claims nothing. Returns each phone with the time its previous summary covered.
create function claim_push_digests(today date)
returns table (endpoint text, p256dh text, auth text, courses uuid[], lab_group text, since timestamptz)
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
  returning p.endpoint, p.p256dh, p.auth, p.courses, p.lab_group, due.since;
$$;

revoke execute on function claim_push_digests(date) from public, anon, authenticated;
grant execute on function claim_push_digests(date) to service_role;
