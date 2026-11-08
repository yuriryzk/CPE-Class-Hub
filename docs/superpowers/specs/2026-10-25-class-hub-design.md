# Class Hub — full-stack design

Date: 2026-10-25
Status: draft, awaiting review
Reference design: `design/prototype.html` (the colourful nine-course prototype; open it in a browser)

## 1. Purpose

Class Hub is the class website for one section (BSCpE 3-C). It answers one question for every classmate:
**what is happening in my nine courses this week, and what do I need to do next?**

- Anyone with the link can view the week, notices and files. No login for viewing.
- Class officers log in with Google and keep it up to date: the weekly class schedule, one-off calendar items
  (quizzes, exams, due dates, no-class days, extra classes), notices and files.
- It is used mostly on phones, from a link shared in the class group chat.

**Success looks like:** a classmate opens the link on their phone and, within a few seconds, sees today's classes,
the next quiz or deadline, and any new notice, without asking anyone. An officer can post a notice from their
phone in under a minute.

### What you said vs. what this spec assumes

Said:
- One class section; everyone views, officers post.
- Viewing is open to anyone; officers log in with Google, and only emails on an officer list get access.
- Free cloud hosting: Next.js and Supabase on Vercel.
- File uploads, push notifications and installing as a phone app are all wanted, built in phases.
- The prototype's behaviour: nine colour-coded courses, a weekly schedule that repeats, one-off calendar items,
  notices that can be linked to a calendar item, a details panel, notices greyed out when done or passed.

Assumed (correct any of these):
- One class, one semester at a time. Starting a new semester means officers rename the nine courses and replace
  the schedule; old items are deleted, not archived.
- Exactly nine course slots, each with a fixed colour. Officers rename them; they are never added or removed.
- All dates and times are Philippine time (Asia/Manila). "Today" and "this week" are computed in that zone,
  whatever the viewer's device says.
- Weeks run Sunday to Saturday. Teaching weeks are numbered 1 to 18 from Sunday 15 November 2026, skipping the Christmas and New Year weeks (see `term`).
- Everything shown is public: no grades, attendance, phone numbers or other private data is stored.
- One **head officer** manages the officer list. The first head officer's email is added once by hand during setup.
- Officers can edit, not only delete, notices, calendar items, files and class times.

## 2. Phases

Each phase ends with something deployed and usable.

| Phase | Delivers |
| --- | --- |
| **1. Core** | Database, public Schedule / Notices / Files pages, details panel, officer Google login, full Admin (classes, calendar, notices, files as links, courses, officers), General files, notices list view, schedule image download, remembered course picks, deployed on Vercel. |
| **2. File uploads** | Officers upload PDFs, slides, documents and images; classmates download them. Links still work. |
| **3. Phone app and push** | Install to home screen (PWA), and classmates who opt in get a push notification when a notice is posted. |

Out of scope for all phases: grades, attendance, comments or reactions, multiple sections or year levels,
student accounts, email notifications, archiving past semesters, analytics.

### Also in Phase 1

- **General files:** a "General" tab on Files, before the course tabs, for class-wide files such as master
  lists and group lists. Files gain an optional course (none = General).
- **Notices list view:** a switch on Notices between the current cards and a detailed list (one row per notice:
  course code, title, posted date, calendar link, status).
- **Download the schedule as an image:** a button on Schedule that saves the shown week, for the selected
  courses, as a PNG.
- **Remembering picked courses (Schedule and Notices):** the selection is saved in the visitor's browser
  (`localStorage`, no login) and also written into the page link (`?course=MICROP,CNS`). Opening a link with
  courses shows those courses and saves them; opening the plain site uses the saved picks, or all courses if
  none are saved. Picking "All" clears both. It is per device: clearing browser data or switching phones resets it.
- **Lab groups (G1 / G2):** five courses (MICROP, CNS, CEDD, HDL, ELEC) split the class into two groups with
  their own lab times. Schedule has a "Both / G1 / G2" switch; "Both" shows every class with its group tagged,
  G1 or G2 hides the other group's labs. The choice is saved in the visitor's browser like the course picks.
  One choice covers all five courses.

## 3. Architecture

```
Phone / laptop browser
   │  HTTPS
   ▼
Vercel ── Next.js (App Router, TypeScript)
   │        • Server Components render the public pages (fresh data, cached briefly)
   │        • Server Actions handle every officer write
   │        • Route handler /api/push/send (phase 3)
   │        • Static PWA files: manifest, service worker (phase 3)
   ▼
Supabase
   • Postgres: courses, class_slots, calendar_items, notices, files, officers, push_subscriptions
   • Row Level Security: anyone reads public tables; only officers write
   • Auth: Google provider; officer status comes from the officers table, not from the login itself
   • Storage: bucket `class-files` (phase 2), public read, officer write
```

Principles:
- **The database enforces who can write.** Every officer write goes through the officer's own Supabase session,
  so Row Level Security decides. A bug in a page cannot let a visitor write. The service-role key is used only
  on the server for sending push notifications (phase 3).
- **Logic that decides what appears on a day lives in one tested module** (`lib/week.ts`): building a week,
  placing regular classes, marking cancelled ones, "next up", and whether a notice is past. The pages only render
  what it returns.
- **The look is the prototype.** Its CSS is ported into the app as plain CSS (global tokens plus CSS modules per
  component); fonts load through `next/font` (Bricolage Grotesque, Figtree). No UI component library.

### Stack

- Next.js 15, App Router, TypeScript, React Server Components, Server Actions
- `@supabase/supabase-js` and `@supabase/ssr` for sessions in cookies
- `zod` for validating every form on the server (and reused on the client for instant messages)
- Vitest for unit tests; Playwright for end-to-end smoke tests
- Phase 3: `web-push` (VAPID) on the server; a hand-written service worker

## 4. Data model

All tables have `id uuid primary key default gen_random_uuid()` and `created_at timestamptz default now()`
unless noted. Times of day are Postgres `time`; dates are `date` (Asia/Manila calendar dates).

### `courses`
| column | type | rules |
| --- | --- | --- |
| slot | smallint | 1–9, unique; decides order and colour |
| name | text | 1–80 characters |
| code | text | 1–8 characters, letters (either case, kept as typed), digits and hyphen, unique |
| color | text | fixed per slot, in this order: red #ff6b6b, orange #ff9f43, yellow #ffd93d, yellow-green #b8e62e, green #3ddc97, blue #5b8cff, purple #a78bfa, pink #ff7ec7, lavender #c6c3ff; not editable in the app |

Seeded during setup with the nine courses of the semester, in slot order: Microprocessors (MICROP), Project Management (PM), CpE Laws and Professional Practice (LAWS), Basic Occupational Health and Safety (BOHS), Introduction to HDL (HDL), Computer Networks and Security (CNS), Methods of Research (MOR), Computer Engineering Drafting and Design (CEDD), Elective 1 (ELEC). Never inserted or deleted from the app.

### `class_slots` (the weekly schedule)
| column | type | rules |
| --- | --- | --- |
| course_id | uuid → courses | on delete cascade |
| weekday | smallint | 1 = Monday … 7 = Sunday |
| starts_at | time | |
| ends_at | time | must be after `starts_at` |
| room | text | optional, up to 40 characters |
| lab_group | text | optional: empty = whole class, or `G1` / `G2` for that group only. Used by MICROP, CNS, CEDD, HDL and ELEC labs; a lecture both groups attend together stays empty |

### `calendar_items` (one-off things)
| column | type | rules |
| --- | --- | --- |
| course_id | uuid → courses | on delete cascade |
| kind | enum | `quiz_exam`, `due`, `no_class`, `extra_class` |
| title | text | 1–120 characters |
| on_date | date | |
| at_time | time | optional |
| notes | text | optional, up to 2,000 characters |
| moved_from_date | date | optional; the original date, set the first time the date or time changes |
| moved_from_time | time | optional; the original time (null when the original had no time) |

**Moving an item:** when an officer saves a new date or time, the original is kept in `moved_from_*` (only the
first time, so it always shows where the item was first scheduled). If the item is moved back to its original
date and time, both fields are cleared. The card shows a **Moved** label and the details panel shows
"Moved from Wednesday 21 October, 5:00 PM". A linked notice shows the new date automatically, because it
points to the item instead of copying its date.

### `notices`
| column | type | rules |
| --- | --- | --- |
| course_id | uuid → courses | on delete cascade |
| title | text | 1–120 characters |
| body | text | 1–4,000 characters |
| posted_on | date | the day it shows on the calendar and in "Posted this week" |
| pinned | boolean | default false |
| done | boolean | default false; set by an officer |
| calendar_item_id | uuid → calendar_items | optional; on delete set null |
| created_by | text | the officer's email |

### `files`
| column | type | rules |
| --- | --- | --- |
| course_id | uuid → courses | on delete cascade |
| title | text | 1–120 characters |
| file_type | text | free text such as "Slides", up to 30 characters |
| week_label | text | optional, such as "Week 3" |
| url | text | for a link; https only |
| storage_path | text | phase 2: path in the `class-files` bucket |
| size_bytes, mime_type | bigint, text | phase 2 |

Exactly one of `url` and `storage_path` is set (check constraint).

### `officers`
| column | type | rules |
| --- | --- | --- |
| email | text primary key | lowercased |
| role | enum | `head` or `officer` |
| added_by | text | email of the head officer who added them |

### `term` (one row) and `term_breaks`
| column | type | rules |
| --- | --- | --- |
| term.starts_on | date | a Sunday; the first day of Week 1 (2026-11-15) |
| term.week_count | smallint | number of teaching weeks (18) |
| term_breaks.starts_on | date | a Sunday inside the term; that week is a break (2026-12-20, 2026-12-27) |
| term_breaks.label | text | shown in the heading, such as "Christmas break" |

Seeded with the values above. Officers can change them under Admin → Courses (a "Semester" section).

### `push_subscriptions` (phase 3)
| column | type | rules |
| --- | --- | --- |
| endpoint | text unique | from the browser |
| p256dh, auth | text | keys from the browser |
| last_success_at | timestamptz | optional |

### Derived rules (in `lib/week.ts`, unit tested)

- **A day's entries:** that weekday's class slots, plus calendar items on that date, plus notices posted that
  date that are not linked to a calendar item. Sorted by start time. An untimed item takes the start time of
  that course's class that day (so a "No class" sits where the cancelled class was); otherwise untimed items and
  notices go after the timed entries.
- **Cancelled class:** a `no_class` item for a course on a date marks that course's slots on that date as
  cancelled. They still show, struck through.
- **Notice is past:** `done` is true, or it is linked to a calendar item whose date is before today.
  Past notices sort after active ones and are greyed out.
- **Grouping:** on each day, entries of the same course share one box (only the course's short code on top, like
  a single card's tag; its entries in time order inside, each still opening the details panel). The box sits at
  its earliest entry's start time among the day's other entries. A course with one entry that day shows a single
  card.
- **Term week number:** for the week starting on Sunday `w`: before `term.starts_on`, no number; a week listed
  in `term_breaks`, that break's label; otherwise the number of weeks since `term.starts_on`, plus one, minus the
  break weeks before `w`, as long as it is at most `term.week_count`. With the seeded values, Week 1 is
  15–21 November 2026, Week 5 is 13–19 December, the two break weeks follow, Week 6 is 3–9 January 2027 and
  Week 18 is 28 March – 3 April 2027.
- **Break weeks:** no regular classes are placed; one-off items still show.
- **Next up:** the three earliest `quiz_exam` or `due` items from today on (date, then time), within the
  selected courses. Fewer than three leaves a "Nothing else due or tested yet" card in the remaining places.

## 5. Security (Row Level Security)

A SQL function `is_officer()` returns true when the signed-in user's email (from the Supabase JWT) is in
`officers`; `is_head_officer()` checks for role `head`. Both are `security definer`, so they can read `officers`
even though visitors cannot.

| table | anyone (anon) | officer | head officer |
| --- | --- | --- | --- |
| courses | read | update name and code | same |
| class_slots, calendar_items, notices, files | read | insert, update, delete | same |
| officers | none | read own row | read, insert, delete (cannot delete self) |
| push_subscriptions | insert, delete own by endpoint (through an API route) | none | none |
| storage `class-files` | read | upload, delete | same |

- Google sign-in itself grants nothing. A Google account not on the list sees "This account isn't an officer"
  and stays a viewer.
- Server Actions re-check `is_officer()` before acting, so they fail with a clear message instead of a
  silent RLS refusal.
- Secrets live only in Vercel environment variables. The browser gets only the Supabase URL and anon key.

## 6. Pages and routes

| route | who | what |
| --- | --- | --- |
| `/` | anyone | Schedule: heading "Schedule of Week N" with "November 15, 2026 to November 21, 2026" for term weeks (outside the term or in a break: "This week" / "Week of 8 Nov" with the long date range, plus the break label), week switcher, three Next up cards, "Your courses" filter, day-by-day calendar (days as columns), Posted this week |
| `/?week=2026-10-26&course=NET,MPU` | anyone | Same, for another week or for one or more courses; shareable |
| `/notices?course=NET,MPU` | anyone | Course tabs (All, then the nine courses; several courses can be selected together, All clears the selection), notice cards, past ones greyed at the end |
| `/files?course=NET` | anyone | Course tabs, files table |
| `/login` | anyone | "Officers sign in with Google" button |
| `/auth/callback` | — | Supabase OAuth callback |
| `/admin` | officer | Redirects to `/admin/notices` |
| `/admin/notices` | officer | Post / edit notice (with the Calendar option: none, link existing, add new), list with Edit, Mark done, Delete |
| `/admin/calendar` | officer | Add / edit one-off items with notes; editing the date or time marks the item as moved; list with Edit, Delete |
| `/admin/classes` | officer | "Class": weekly classes grouped by day; add, edit, delete |
| `/admin/files` | officer | Add / edit links (phase 1) and uploads (phase 2); list |
| `/admin/courses` | officer | Rename the nine courses and codes (8 characters at most) |
| `/admin/officers` | head officer | Add or remove officers by email |

- **Course filters:** on Schedule and Notices, tapping a course adds it to the selection and tapping it again removes it; "All courses" clears the selection, and selecting all nine counts as All. Selected courses show a tick. Files keeps one course at a time.
- The details panel opens over the Schedule page when a card is tapped (a client component using `<dialog>`).
  It needs no separate route.
- Admin lists use fixed columns: code (8 characters wide), title and details, actions.
- **Editing:** Edit loads the item into the form beside the list, which turns blue and reads "Edit notice",
  "Edit calendar item" or "Edit class time", with Save changes and Cancel editing; the row being edited is
  highlighted. Editing a notice can also change its calendar link. For an edited notice, the push tick box
  reads "Send a push notification about the change" and starts unticked (phase 3).
- The header shows "Officer sign in" for visitors, and the officer's name, Admin and Sign out once signed in.
- The prototype's "Turn on notifications" button and "Send a push notification" tick box are hidden until phase 3.

### Freshness

Public pages are rendered on the server and revalidated whenever an officer saves anything
(`revalidatePath`), with a 60-second fallback. Officers see their own change immediately.

## 7. Phase 2: file uploads

- Supabase Storage bucket `class-files`, public read, officer write (RLS on `storage.objects`).
- Allowed: PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, TXT, ZIP, PNG, JPG. Up to 25 MB per file (Supabase free plan
  limit is 50 MB).
- The browser uploads straight to Storage with the officer's session, then a Server Action saves the `files`
  row. If saving the row fails, the uploaded object is deleted.
- Deleting a file row also deletes its object.
- The free plan includes 1 GB of storage; Admin → Files shows the total used.

## 8. Phase 3: phone app and push notifications

- `manifest.webmanifest` with name, the nine-dot icon (generated PNGs at 192 and 512), theme colour and
  `display: standalone`. A service worker caches the app shell and the last-seen Schedule page so it opens offline
  with a "You're offline; this is the last saved week" notice.
- "Turn on notifications" asks permission, subscribes with the VAPID public key and sends the subscription to
  `/api/push/subscribe`. "Turn off" removes it.
- When an officer posts a notice with "Send a push notification" ticked, the server sends
  "MPU: Lab 3 moved to Wednesday" to every subscription. Subscriptions that return 404 or 410 are deleted.
- On iPhone, push works only after the app is added to the home screen (iOS 16.4 or later). The button explains
  this on iPhones that are not installed.

## 9. Error handling

- **Forms:** validated with zod on the server; messages sit under the field in plain words ("End time must be
  after the start time", "Codes are up to 8 characters"). The same schemas give instant messages in the browser.
- **Saves:** every Server Action returns `{ ok: true }` or `{ ok: false, message }`; the page shows a toast in the
  prototype's style. Database constraint errors are translated (a duplicate course code becomes "Another course
  already uses NET").
- **Not an officer:** a clear page with "Sign out" and "Back to the week".
- **Data fails to load:** the block that failed shows "Couldn't load the calendar. Try again." with a retry
  link; the rest of the page still renders.
- **Supabase free project paused** (after a week with no visits): pages show a friendly "Class Hub is waking up,
  try again in a minute" instead of a crash. Any visit or a scheduled ping keeps it awake.

## 10. Testing

- **Unit (Vitest):** `lib/week.ts` (week building across month ends, weekday mapping, cancelled classes, past
  notices, next up, counts, Asia/Manila "today" near midnight), time parsing and formatting ("7:30 AM"),
  zod schemas.
- **Database:** an SQL test script run against the development Supabase project that checks RLS: anon can read
  and cannot write; a non-officer cannot write; an officer can; only the head officer manages officers.
- **End to end (Playwright):** public pages render and the details panel opens; with a test officer session,
  post a notice that adds a calendar item and see it on the week.
- **Manual before each deploy:** Google sign-in as an officer and as a non-officer, on a phone.
- Two Supabase projects: `class-hub-dev` for development and tests, `class-hub` for the live site.

## 11. Setup you will do (guided step by step when we get there)

1. A GitHub account and an empty repository for this folder.
2. A Supabase account with two projects (dev and live).
3. A Google Cloud OAuth client for "Sign in with Google", connected in Supabase.
4. A Vercel account connected to the GitHub repository, with the Supabase keys as environment variables.
5. Phase 3 only: VAPID keys, generated by a command and added to Vercel.

## 12. Repository layout

```
app/                  routes (public pages, login, admin)
components/           UI pieces: calendar, cards, details dialog, tabs, forms, toast
lib/week.ts           week and day logic (pure, tested)
lib/time.ts           time parsing and formatting
lib/schemas.ts        zod schemas shared by forms and actions
lib/supabase/         server and browser clients
supabase/migrations/  SQL: tables, constraints, RLS, functions, seed
styles/               ported prototype CSS (tokens, components)
tests/                Vitest and Playwright
design/prototype.html the reference design
```
