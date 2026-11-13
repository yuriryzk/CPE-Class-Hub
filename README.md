# Class Hub

A small website for CPE 3C: this week's schedule, notices, files and officers. Anyone can read it; only officers (signed in with Google) can post and edit.

## Run it locally

You need Node 24 and Docker Desktop (open and running).

1. `npm install`
2. `npx supabase start` (first run downloads images, so it takes a while)
3. Copy `.env.example` to `.env.local`. Run `npx supabase status` and copy two values into it:
   - `NEXT_PUBLIC_SUPABASE_URL` = the API URL (`http://127.0.0.1:54321`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the anon key (newer CLIs call it the publishable key)
4. `npx supabase db reset` (builds the tables and loads test data from `seed.sql`)
5. `npm run dev`, then open http://localhost:3000

## Run the tests

Keep the local stack running, and run `npx supabase db reset` first so the data is fresh.

- `npm test` unit tests
- `npx supabase test db` database tests
- `npm run e2e` browser tests

## Go live

You do every sign-up and paste every secret yourself. Do not commit `.env.local` or any key, ever.

1. **GitHub.** Create a new empty repo on github.com (no README, .gitignore or license). Add it as `origin`, then `git push -u origin main`. Vercel deploys from `main`.
2. **Supabase project.** On supabase.com click New project, name it `class-hub`, pick a region near you (we use Singapore, `ap-southeast-1`), and save the database password somewhere safe. Then in this folder run `npx supabase login`, `npx supabase link` (pick `class-hub`) and `npx supabase db push --remote`. Without `--remote` the push goes to the local database. This applies the migrations only. Do not run `seed.sql` on the live project: it holds local test data.
3. **Supabase Auth settings.** Dashboard, Authentication, Sign In / Providers. Turn Google on (step 4 gives you the keys). Turn the Email provider OFF, so nobody can sign up with an email and password. Officer status trusts the account email, so only Google sign-in may create users.
4. **Google sign-in.**
   - In Supabase, open the Google provider page and copy the callback URL (`https://<ref>.supabase.co/auth/v1/callback`).
   - Go to console.cloud.google.com, create a project, then APIs & Services, OAuth consent screen (External), then Credentials, Create credentials, OAuth client ID, type Web application. Under Authorised redirect URIs paste the Supabase callback URL.
   - Copy the client ID and client secret from Google into the Supabase Google provider page and save.
   - After step 5 you will know your Vercel URL. In Supabase, Authentication, URL Configuration: set Site URL to the Vercel URL, and add `<vercel-url>/auth/callback` to Redirect URLs.
5. **Vercel.** On vercel.com click Add New, Project, import the GitHub repo. Before deploying, add two environment variables with the live values from Supabase, Project Settings, API: `NEXT_PUBLIC_SUPABASE_URL` (Project URL) and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon / publishable key). Under Settings, Functions, set the Function Region to the same place as the database (Singapore, `sin1`), or every page waits on a trip across the Pacific. Click Deploy, then go back to step 4 and enter the Vercel URL.
6. **First head officer.** In Supabase, SQL Editor, run this with the real Google email of the head officer:

   ```sql
   insert into officers (email, role, added_by)
   values ('head-officer@example.com', 'head', 'setup');
   ```

   Write the email in lowercase (the table rejects capitals). Other officers are added from the site by the head officer.
7. **Check on a phone.**
   - Open the live link. You should see the week.
   - Sign in with the head officer's Google account, post a notice, and see it on Schedule.
   - Sign in with a Google account that is not on the list. You should see "This account isn't an officer".

## Phone app and daily notifications

Classmates can add Class Hub to their home screen, and opt in (footer, **Notifications**) to one summary a day, around
7 PM Manila: tomorrow's classes and calendar items (quizzes, due dates, no-class days, extra classes) and notices
dated tomorrow, built the same way the Schedule builds a day. They pick courses and Both / G1 / G2; no account. Nothing
is sent when tomorrow is empty for them. The service worker (`public/sw.js`) also keeps
the last Schedule page seen, so Schedule opens offline with a note saying so.

How it fits together:

- `push_subscriptions` (migration `0009`) holds each phone's push address and choices. Row-level security is on with
  no policies, so visitors and officers cannot read or change it; only the server's service-role key can.
- `app/actions/push.ts` saves or removes a subscription. `app/api/cron/digest` sends the summaries.
- Vercel Cron calls the job once a day (`vercel.json`, `0 11 * * *` = 11:00 UTC = 7 PM Manila). On the free (Hobby)
  plan Vercel runs it at any point within that hour, so summaries arrive between 7:00 and 7:59 PM. Cron runs only on
  production deployments, and Vercel does not retry a failed run.
- The job is safe to run twice: `claim_push_digests` gives each phone at most one summary per Manila day. Phones whose
  push service answers 404 or 410 are deleted.

### Set up (once)

1. Generate keys: `npx web-push generate-vapid-keys`. Keep the private key secret.
2. Make a cron secret: any long random string (for example `npx -y uuid` twice, joined).
3. In Vercel, Settings, Environment Variables, add these for **Production**:
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase, Project Settings, API, `service_role` (secret) key. Server only.
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: the public key from step 1.
   - `VAPID_PRIVATE_KEY`: the private key from step 1.
   - `VAPID_SUBJECT`: `mailto:` plus an officer's email, for push services to contact.
   - `CRON_SECRET`: the secret from step 2. Vercel sends it to the job; anyone without it gets 401.
4. `npx supabase db push --remote` (migration `0009`), then deploy as in "Release an update".
5. Check the job by hand: `curl -H "Authorization: Bearer <CRON_SECRET>" https://<your-site>/api/cron/digest`.
   It answers with counts, for example `{"claimed":3,"sent":2,"skipped":1,"failed":0,"removed":0}`. A second call the
   same day answers `"claimed":0`.

For local work, `.env.local` needs the same five names (local values: the service key from `npx supabase status`).

### Test on real devices

- **Android (Chrome):** open the site, footer, Notifications, pick courses and a group, Turn on, allow. Install the app
  from Chrome's menu. Run the job by hand (step 5) on a day before classes, or after posting a notice dated tomorrow; the summary appears; tapping it opens Class Hub
  on the right page.
- **iPhone (iOS 16.4 or later):** in Safari, Notifications explains Add to Home Screen. Do that, open Class Hub from the
  Home Screen icon, then Turn on and allow. Run the job; the summary appears. Sign in once more inside the home-screen
  app if you are an officer (iOS keeps its sign-in apart from Safari).
- **Desktop (Chrome, Edge, Firefox):** Turn on, run the job, see the summary while the browser is open.
- **Choices:** a G1-only phone gets no G2-only items; a phone that picked MOR gets no CNS items; Save changes updates
  them; Turn off stops the summaries.
- **Offline:** open Schedule once, turn on airplane mode, open Class Hub again: the last week shows with the offline note.

## Release an update

1. Run the tests (see above).
2. If the update adds a file in `supabase/migrations/`, run `npx supabase db push --remote` first, so the live database is ready before the new code.
3. `git add -A`, then `git commit -m "What changed"`.
4. `npm version patch -m "Release %s"` for fixes, or `minor` for new features. This bumps the version in `package.json` (shown in the footer) and tags the commit.
5. `git push --follow-tags`. Vercel deploys `main` within a few minutes.

If a release breaks the site, open Vercel, Deployments, the previous one, and choose Promote to Production.

## Keeping the free project awake

A free Supabase project pauses after about a week with no visits. Any visit to the site wakes it. While it wakes, the page says "Class Hub is waking up"; try again in a minute. If it is paused for long, you can also press Restore in the Supabase dashboard.
