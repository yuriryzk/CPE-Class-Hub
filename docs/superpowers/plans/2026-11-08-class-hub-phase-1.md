# Class Hub Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the public Schedule, Notices and Files pages and the officer Admin for BSCpE 3-C on Vercel, backed by Supabase.

**Architecture:** Next.js App Router renders public pages on the server from Supabase (anon key, RLS read). Officers sign in with Google through Supabase Auth; every write is a Server Action using the officer's own session, so RLS decides. All "what shows on a day" logic is pure and lives in `lib/week.ts`, tested with Vitest; pages only render its output.

**Tech Stack:** Next.js 15 (App Router, TypeScript), `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `html-to-image` (PNG download), Vitest, Playwright, Supabase CLI (migrations and `supabase test db`).

**Spec:** `docs/superpowers/specs/2026-10-25-class-hub-design.md` (approved 2026-11-08). Reference look: `design/prototype.html`.

## Global Constraints

- All dates and times are Asia/Manila. Dates travel as `YYYY-MM-DD` strings; no date library.
- Weeks run Sunday to Saturday. DB `weekday`: 1 = Monday … 7 = Sunday.
- Term: Week 1 starts 2026-11-15, 18 teaching weeks, breaks 2026-12-20 "Christmas break" and 2026-12-27 "New Year break" (seeded in `term`, `term_breaks`, never hard-coded in app code).
- Nine courses, fixed slot order and colours: red #ff6b6b, orange #ff9f43, yellow #ffd93d, yellow-green #b8e62e, green #3ddc97, blue #5b8cff, purple #a78bfa, pink #ff7ec7, lavender #c6c3ff. Seed: Microprocessors (MICROP), Project Management (PM), CpE Laws and Professional Practice (LAWS), Basic Occupational Health and Safety (BOHS), Introduction to HDL (HDL), Computer Networks and Security (CNS), Methods of Research (MOR), Computer Engineering Drafting and Design (CEDD), Elective 1 (ELEC).
- Course codes: 1–8 characters, letters (case kept), digits, hyphen, unique.
- Kind labels shown to people: `quiz_exam` "Quiz/exam", `due` "Due", `no_class` "No class", `extra_class` "Extra class".
- File links must start with `https://`.
- Lab groups: `''` (whole class), `G1`, `G2`.
- The look is the prototype: port its CSS as plain CSS (global tokens + CSS modules). No UI component library. Fonts via `next/font`: Bricolage Grotesque (headings), Figtree (body).
- Every Server Action returns `{ ok: true } | { ok: false; message: string }` and calls `revalidatePath('/', 'layout')` on success.
- Push notifications, the "Turn on notifications" button and file uploads are not in Phase 1; hide them.

## Review Focus

1. **Midnight in Manila:** at 23:30 UTC on 7 Nov 2026 "today" is 2026-11-08 and the Schedule opens on the week of Sunday 8 Nov. Test in Task 1.
2. **Noon and midnight times:** "12:00 PM" is 720 minutes, "12:30 AM" is 30, "7:30 am" parses like "7:30 AM", "13:00 PM" is rejected. Test in Task 1.
3. **Old or hand-typed links:** `?course=microp,XYZ` shows MICROP only; a code renamed after the link was shared is skipped, not an error. Test in Task 4.
4. **Break weeks:** 2026-12-20 shows "Christmas break, no classes", no class slots, but one-off items on those dates still show. Test in Task 3.
5. **Group-hidden cancels:** with G2 chosen, a `no_class` item tied to a G1 slot is hidden; with Both, the G1 slot shows cancelled and a G2 slot of the same course that day does not. Test in Task 3.

---

## File structure

```
app/layout.tsx                 fonts, header, toast host
app/page.tsx                   Schedule (server) → components/schedule/*
app/notices/page.tsx           Notices
app/files/page.tsx             Files
app/login/page.tsx, app/auth/callback/route.ts, app/auth/signout/route.ts
app/admin/layout.tsx           requireOfficer gate + Admin tabs
app/admin/{notices,calendar,classes,files,courses,officers}/page.tsx
app/admin/actions/*.ts         Server Actions, one file per table
components/                    Calendar, DayColumn, EventCard, GroupBox, NextUp, CourseFilter,
                               GroupSwitch, WeekNav, DetailsDialog, Tabs, Toast, ConfirmDelete,
                               DownloadPng, AdminRow, forms/*
lib/time.ts                    time parsing, formatting, Manila today, date maths
lib/week.ts                    week/day logic (pure)
lib/picks.ts                   course-pick and group rules (pure)
lib/schemas.ts                 zod schemas
lib/types.ts                   row types shared by lib and pages
lib/data.ts                    Supabase reads for pages
lib/supabase/{server,browser}.ts
lib/auth.ts                    getOfficer, requireOfficer
supabase/migrations/0001_init.sql, 0002_rls.sql, 0003_seed.sql
supabase/tests/rls.test.sql
styles/tokens.css, styles/*.module.css
tests/unit/*.test.ts, tests/e2e/*.spec.ts
```

---

### Task 1: Project scaffold and `lib/time.ts`

**Files:**
- Create: Next.js app at repo root (`package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `.env.example`, `.gitignore` additions), `lib/time.ts`
- Test: `tests/unit/time.test.ts`

**Interfaces:**
- Produces:
  - `parseTime(s: string): number | null` — minutes after midnight, `null` if invalid. Accepts `h:mm AM/PM`, any case, optional space.
  - `formatTime(min: number): string` — `"7:30 AM"`.
  - `toPgTime(min: number): string` / `fromPgTime(t: string): number` — `"07:30:00"` ↔ 450.
  - `manilaToday(now?: Date): string` — `YYYY-MM-DD` in Asia/Manila.
  - `manilaNowMinutes(now?: Date): number`
  - `addDays(d: string, n: number): string`, `sundayOf(d: string): string`, `weekdayOf(d: string): number` (1 = Mon … 7 = Sun)
  - `formatLong(d: string): string` → `"Sunday 8 November 2026"`; `formatUS(d: string): string` → `"November 15, 2026"`; `formatShort(d: string): string` → `"Wed 11 Nov"`

- [ ] **Step 1:** `npx create-next-app@15 . --ts --app --eslint --no-tailwind --no-src-dir --import-alias "@/*"` (keep existing `design/`, `docs/`), then `npm i @supabase/supabase-js @supabase/ssr zod html-to-image` and `npm i -D vitest @playwright/test supabase`. Add scripts `"test": "vitest run"`, `"e2e": "playwright test"`. Add the untracked leftovers (`.taste-skill/`, `class-hub*/`, `before/`, `_now.html`) to `.gitignore` unless the user deleted them. `.env.example` lists `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] **Step 2: Write the failing tests** in `tests/unit/time.test.ts`:

```ts
expect(parseTime('7:30 AM')).toBe(450);
expect(parseTime('7:30am')).toBe(450);
expect(parseTime('12:00 PM')).toBe(720);
expect(parseTime('12:30 AM')).toBe(30);
expect(parseTime('13:00 PM')).toBeNull();
expect(parseTime('')).toBeNull();
expect(formatTime(810)).toBe('1:30 PM');
expect(fromPgTime('07:30:00')).toBe(450);
expect(toPgTime(450)).toBe('07:30:00');
expect(manilaToday(new Date('2026-11-07T23:30:00Z'))).toBe('2026-11-08');
expect(manilaToday(new Date('2026-11-07T15:59:00Z'))).toBe('2026-11-07');
expect(sundayOf('2026-11-11')).toBe('2026-11-08');
expect(sundayOf('2026-11-08')).toBe('2026-11-08');
expect(addDays('2026-11-29', 3)).toBe('2026-12-02');
expect(weekdayOf('2026-11-08')).toBe(7);
expect(formatUS('2026-11-15')).toBe('November 15, 2026');
expect(formatLong('2026-11-08')).toBe('Sunday 8 November 2026');
```

- [ ] **Step 3:** `npm test -- time` → FAIL (module missing).
- [ ] **Step 4:** Implement `lib/time.ts`. Date maths on `Date.UTC` parts so the server's zone never matters; `manilaToday` via `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' })`.
- [ ] **Step 5:** `npm test -- time` → PASS. `npm run build` → succeeds.
- [ ] **Step 6:** Commit `Scaffold Next.js app with time helpers`.

---

### Task 2: Database schema, RLS and seed

**Files:**
- Create: `supabase/config.toml` (`npx supabase init`), `supabase/migrations/0001_init.sql`, `0002_rls.sql`, `0003_seed.sql`, `supabase/tests/rls.test.sql`, `lib/types.ts`

**Interfaces:**
- Produces (tables exactly as spec §4, plus):
  - enum `item_kind` (`quiz_exam`,`due`,`no_class`,`extra_class`), enum `officer_role` (`head`,`officer`)
  - `class_slots.lab_group text not null default '' check (lab_group in ('','G1','G2'))`
  - `calendar_items.class_slot_id uuid references class_slots on delete cascade`, check `class_slot_id is null or kind = 'no_class'`
  - `notices.calendar_item_id uuid unique references calendar_items on delete set null`
  - `files.course_id uuid null references courses on delete cascade`; check `(url is null) <> (storage_path is null)`; check `url is null or url like 'https://%'`
  - `courses.code` check `code ~ '^[A-Za-z0-9-]{1,8}$'`, unique on `lower(code)`
  - `class_slots` check `ends_at > starts_at`; `weekday between 1 and 7`
  - `term` single row (`id boolean primary key default true check (id)`), `term_breaks(starts_on date primary key, label text)`; check `extract(dow from starts_on) = 0` on both
  - functions `is_officer()`, `is_head_officer()` — `security definer`, `set search_path = public`, compare `lower(auth.jwt()->>'email')`
  - `lib/types.ts`: `Course`, `Slot`, `Item`, `Notice`, `FileRow`, `Term`, `TermBreak` matching columns (times as `string` from Postgres; `Item.kind: 'quiz_exam'|'due'|'no_class'|'extra_class'`; `Slot.lab_group: ''|'G1'|'G2'`)

- [ ] **Step 1: Write the failing pgTAP test** `supabase/tests/rls.test.sql`, using `set local role anon` / `authenticated` with `set local request.jwt.claims` to impersonate. Assertions:
  - anon `select count(*) from courses` = 9; anon `insert into notices …` throws `42501`.
  - authenticated as `nobody@example.com` (not in officers): insert into `notices` throws.
  - authenticated as a seeded test officer: insert into `notices`, update `term`, insert `term_breaks` succeed.
  - officer cannot insert into `officers`; head officer can; head officer cannot delete own row.
  - anon cannot `select` from `officers`.
  - insert `files` with `url = 'javascript:alert(1)'` throws `23514`.
  - insert two notices with the same `calendar_item_id` throws `23505`.
  - insert course code `'TOOLONGCODE'` throws.
- [ ] **Step 2:** `npx supabase test db --linked` against `class-hub-dev` → FAIL (no tables).
- [ ] **Step 3:** Write the three migrations. RLS per spec §5 table (courses: officer `update` only, no insert/delete policy; term/term_breaks: anon read, officer write). Seed: nine courses, the term row and two breaks, and the first head officer from a `\set` placeholder the user fills in during setup (documented at the top of `0003_seed.sql`; no real email committed).
- [ ] **Step 4:** `npx supabase db push --linked` then `npx supabase test db --linked` → all pass.
- [ ] **Step 5:** Commit `Add database schema, RLS and seed`.

---

### Task 3: `lib/week.ts`

**Files:**
- Create: `lib/week.ts`
- Test: `tests/unit/week.test.ts`

**Interfaces:**
- Consumes: `lib/time.ts`, `lib/types.ts`
- Produces:
  - `type Group = '' | 'G1' | 'G2'`
  - `type Entry = { t: 'slot'; slot: Slot; course: string; m: number; cancelled: boolean } | { t: 'item'; item: Item; course: string; m: number } | { t: 'note'; notice: Notice; course: string; m: number }`
  - `termWeek(weekStart: string, term: Term, breaks: TermBreak[]): number | string | null` — number, break label, or null
  - `dayEntries(date: string, d: WeekData, sel: string[], group: Group): Entry[]` where `WeekData = { slots: Slot[]; items: Item[]; notices: Notice[]; term: Term; breaks: TermBreak[] }`; `sel` is course ids, empty = all
  - `groupByCourse(entries: Entry[]): Entry[][]` — insertion order of first appearance
  - `nextUp(items: Item[], todayISO: string, nowMin: number, sel: string[], n = 3): Item[]`
  - `isPastNotice(n: Notice, items: Item[], todayISO: string): boolean`
  - `sortNotices(ns: Notice[], items: Item[], todayISO: string): Notice[]` — active before past, then pinned first, then `posted_on` descending
  - `movedFields(orig: Pick<Item,'on_date'|'at_time'|'moved_from_date'|'moved_from_time'>, nextDate: string, nextTime: string | null): { moved_from_date: string | null; moved_from_time: string | null }`

Rules are spec §4 "Derived rules"; untimed entries that are not slot-anchored use `m = 9000`, notices `m = 10000`; `Array.prototype.sort` is stable so equal `m` keeps slot → item → note order.

- [ ] **Step 1: Write the failing tests** (fixtures built in the test file from the seeded term: start 2026-11-15, 18 weeks, the two breaks):
  - `termWeek('2026-11-15') === 1`, `('2026-12-13') === 5`, `('2026-12-20') === 'Christmas break'`, `('2026-12-27') === 'New Year break'`, `('2027-01-03') === 6`, `('2027-03-28') === 18`, `('2027-04-04') === null`, `('2026-11-08') === null`.
  - Break week: a slot on Tuesday and a `due` item on 2026-12-22 → `dayEntries('2026-12-22', …)` contains the item and no slot.
  - Ordering: slot 7:30 AM, item 1:00 PM, untimed `no_class` for a course whose slot starts 10:30 AM → order `[7:30 slot, 10:30 slot(cancelled), no_class item, 1:00 item]` with the no_class `m` = 630.
  - Whole-course cancel: `no_class` without `class_slot_id` cancels both a G1 and a G2 slot of that course that day.
  - One-slot cancel: `no_class` with `class_slot_id` = G1 slot cancels only that slot; its `m` = that slot's start.
  - Group G2: G1 slot absent, the G1-slot `no_class` item absent, whole-class slot present.
  - `sel=['cns']` keeps only CNS entries.
  - `groupByCourse` on `[A 7:30, B 9:00, A 1:00]` → `[[A,A],[B]]`.
  - `nextUp`: today 2026-11-10 at 14:00, items: due 2026-11-10 13:00 (skipped), due 2026-11-10 untimed (kept), quiz 2026-11-12 09:00, due 2026-11-09 (skipped), `extra_class` (skipped) → first two in order; `n` caps at 3.
  - `isPastNotice`: `done` → true; linked item dated yesterday → true; linked item today → false; unlinked, not done → false.
  - `movedFields`: first move from 2026-11-10 5:00 PM to 2026-11-11 → `{ moved_from_date: '2026-11-10', moved_from_time: '17:00:00' }`; second move keeps the first original; moving back to the original clears both to `null`.
- [ ] **Step 2:** `npm test -- week` → FAIL.
- [ ] **Step 3:** Implement `lib/week.ts`.
- [ ] **Step 4:** `npm test -- week` → PASS.
- [ ] **Step 5:** Commit `Add week logic`.

---

### Task 4: `lib/picks.ts`

**Files:**
- Create: `lib/picks.ts`
- Test: `tests/unit/picks.test.ts`

**Interfaces:**
- Produces:
  - `resolvePicks(linkCodes: string | null, savedIds: string[] | null, courses: Pick<Course,'id'|'code'|'slot'>[]): { ids: string[]; save: boolean }` — `ids` sorted by slot; `[]` means All; `save` true when the link had courses
  - `toggle(ids: string[], id: string | 'all', total: number): string[]` — 'all' → `[]`; all `total` selected → `[]`
  - `codesParam(ids: string[], courses): string | null` — `"MICROP,CNS"` or `null` for All
  - `parseGroup(v: string | null): Group` — anything but `G1`/`G2` → `''`
  - Storage keys: `classhub.picks` (JSON array of ids), `classhub.group`

- [ ] **Step 1: Write the failing tests:**
  - link `"microp,CNS"` + saved `['pm']` → `{ ids: [micro, cns], save: true }`
  - link `"XYZ,cns"` → `[cns]`; link `"XYZ"` only → `{ ids: [], save: true }`
  - link `null` + saved `['cns','micro']` → `[micro, cns]`, `save: false`
  - link `null` + saved containing a deleted id → that id dropped
  - link `null` + saved `null` → `[]`
  - `toggle([], 'cns', 9)` → `['cns']`; `toggle(['cns'], 'cns', 9)` → `[]`; toggling the ninth → `[]`; `toggle(['cns'], 'all', 9)` → `[]`
  - `codesParam([], …)` → `null`
  - `parseGroup('g1')` → `''`, `parseGroup('G1')` → `'G1'`
- [ ] **Step 2:** `npm test -- picks` → FAIL. **Step 3:** implement. **Step 4:** PASS.
- [ ] **Step 5:** Commit `Add course pick rules`.

---

### Task 5: `lib/schemas.ts`

**Files:**
- Create: `lib/schemas.ts`
- Test: `tests/unit/schemas.test.ts`

**Interfaces:**
- Consumes: `parseTime` from Task 1
- Produces zod schemas (input = `FormData` entries as strings, output = DB-ready values with times as `HH:MM:SS`):
  `noticeSchema` (course_id, title 1–120, body 1–4000, posted_on, pinned, calendar: `'none' | 'link' | 'new'`, calendar_item_id?, new item fields), `itemSchema` (course_id, kind, title 1–120, on_date, at_time optional, notes ≤2000), `slotSchema` (course_id, weekday 1–7, starts_at, ends_at, room ≤40, lab_group), `fileSchema` (course_id or `''` for General, title 1–120, file_type ≤30, week_label optional, url https), `courseSchema` (name 1–80, code), `termSchema`, `breakSchema`, `officerSchema` (email lowercased).
- Messages (exact copy): `"End time must be after the start time"`, `"Codes are up to 8 characters"`, `"Use times like 7:30 AM"`, `"Links must start with https://"`.

- [ ] **Step 1: Write the failing tests:** slot 9:00 AM → 7:30 AM fails with the end-time message; code `"TOOLONGCODE"` fails with the code message; url `"javascript:alert(1)"` and `"http://x.com"` fail with the https message; a valid slot returns `{ starts_at: '07:30:00', ends_at: '09:00:00', lab_group: 'G1', … }`; `file.course_id ''` → `null`; officer email `"A@B.COM "` → `"a@b.com"`.
- [ ] **Step 2–4:** fail, implement, pass (`npm test -- schemas`).
- [ ] **Step 5:** Commit `Add form schemas`.

---

### Task 6: Supabase clients, data loading, layout and styles

**Files:**
- Create: `lib/supabase/server.ts`, `lib/supabase/browser.ts`, `lib/data.ts`, `app/layout.tsx`, `styles/tokens.css`, `components/Toast.tsx`, `components/Header.tsx`, `app/error.tsx`
- Test: `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Produces:
  - `serverClient(): SupabaseClient` (cookies via `@supabase/ssr`), `browserClient()`
  - `loadCourses()`, `loadWeek(weekStart: string): Promise<WeekData>` (slots, items `on_date` within the week, notices posted in the week plus those linked to those items, term, breaks), `loadUpcoming(today: string): Promise<Item[]>` (`quiz_exam`/`due` from today, ordered, limit 60), `loadNotices()`, `loadFiles()`
  - Each loader throws `LoadError` with `.what` (`'calendar'`, `'notices'`, …); pages catch per block and show "Couldn't load the {what}. Try again." with a retry link.
  - When a Supabase call fails with a connection error or 5xx/540 (paused project), `app/error.tsx` shows "Class Hub is waking up, try again in a minute".
  - `Toast` client component: `toast(message: string)`.
- [ ] **Step 1:** Port the prototype's `:root` tokens, base, header, buttons, tags, box and toast CSS into `styles/tokens.css` and component CSS modules. Header nav: Schedule `/`, Notices `/notices`, Files `/files`; right side "Officer sign in" (Task 9 fills the signed-in state).
- [ ] **Step 2: Write the failing e2e test:** `/` responds 200, has the header links Schedule, Notices, Files, and no element with text "Turn on notifications".
- [ ] **Step 3:** `npm run e2e -- smoke` → FAIL. **Step 4:** implement. **Step 5:** PASS.
- [ ] **Step 6:** Commit `Add data loading, layout and base styles`.

---

### Task 7: Schedule page

**Files:**
- Create: `app/page.tsx`, `components/schedule/{WeekNav,NextUp,CourseFilter,GroupSwitch,Calendar,DayColumn,EventCard,GroupBox,DetailsDialog,PostedThisWeek,DownloadPng,PicksSync}.tsx` and their CSS modules
- Test: `tests/e2e/schedule.spec.ts`

**Interfaces:**
- Consumes: Tasks 1, 3, 4, 6
- Search params: `week` (any date; normalised with `sundayOf`, default `sundayOf(manilaToday())`), `course` (codes), `group` is **not** a URL param (localStorage only).
- `PicksSync` (client): on load with no `course` param and saved picks present, `router.replace` with `?course=` from saved picks; with a `course` param, saves resolved ids. One storage key, shared with Notices.
- `GroupSwitch` (client): Both / G1 / G2, `aria-pressed`, saved in `classhub.group`; filtering of slots happens client-side by re-running `dayEntries` with the group (the page passes `WeekData` to a client `Calendar`).
- Heading: term week → "Schedule of Week N" + `"{formatUS(start)} to {formatUS(end)}"`; otherwise "This week" / "Week of 8 Nov" + `"{formatLong(start)} to {formatLong(end)}"`, plus `" · {label}, no classes"` in a break.
- `DetailsDialog`: native `<dialog>`; rows When, Where, Group ("Whole class" when empty), Repeats, Why (cancelled), Moved from, linked notice, files for the course. The officer-only cancel/restore footer comes in Task 11.
- `DownloadPng`: renders a hidden clone of the calendar at 1280 px wide with all seven days, `toPng` from `html-to-image`, downloads `schedule-week-{N or start date}.png`.
- Phone layout (≤ 640 px): the calendar scrolls sideways, two days visible, as in the prototype.

- [ ] **Step 1: Write the failing e2e tests** (seed one test week via a fixture SQL in `tests/e2e/fixtures.sql`, applied to `class-hub-dev` before the run):
  - `/?week=2026-11-15` shows "Schedule of Week 1" and "November 15, 2026 to November 21, 2026".
  - `/?week=2026-12-20` shows "Christmas break, no classes" and no class cards.
  - Clicking G1 hides cards tagged "G2"; reload keeps G1 pressed.
  - `/?course=cns` shows only CNS cards and the CNS filter button pressed; then `/` restores `?course=CNS`.
  - Clicking a card opens a dialog with "When"; Escape closes it.
  - Download button produces a download whose suggested filename ends `.png`.
  - At 375 px wide, `document.documentElement.scrollWidth <= innerWidth`.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS (`npm run e2e -- schedule`).
- [ ] **Step 5:** Commit `Add Schedule page`.

---

### Task 8: Notices and Files pages

**Files:**
- Create: `app/notices/page.tsx`, `app/files/page.tsx`, `components/Tabs.tsx`, `components/notices/{NoticeCard,NoticeList,ViewSwitch}.tsx`, `components/files/FileTable.tsx`
- Test: `tests/e2e/notices-files.spec.ts`

**Interfaces:**
- Consumes: `sortNotices`, `isPastNotice` (Task 3), picks (Task 4), `PicksSync` (Task 7)
- Notices: multi-select course tabs (All first) with the hint "Tap several courses to see them together"; view switch Cards / List (saved in `classhub.noticesView`); list columns: code, title, posted date, calendar link, status (Active / Done / Passed). Past notices greyed and last.
- Files: single-select tabs `General`, then the nine courses (`?course=CNS`, `?course=general`); General shows rows with `course_id` null. Links open in a new tab with `rel="noopener"`.

- [ ] **Step 1: Write the failing e2e tests:** a done notice renders after an active one and has the greyed class; List view shows a table with header "Status"; `/files?course=general` lists a General fixture file and not a CNS one; selecting MOR on Notices then opening `/` shows `?course=MOR`.
- [ ] **Step 2–4:** fail, implement, pass.
- [ ] **Step 5:** Commit `Add Notices and Files pages`.

---

### Task 9: Officer sign-in

**Files:**
- Create: `app/login/page.tsx`, `app/auth/callback/route.ts`, `app/auth/signout/route.ts`, `lib/auth.ts`, `app/admin/layout.tsx`, `app/admin/page.tsx` (redirect to `/admin/notices`), `app/admin/not-officer.tsx`
- Modify: `components/Header.tsx`
- Test: `tests/unit/auth.test.ts`, `tests/e2e/auth.spec.ts`

**Interfaces:**
- Produces:
  - `getOfficer(): Promise<{ email: string; role: 'head' | 'officer' } | null>` — reads the session, then `officers` (allowed by "read own row")
  - `requireOfficer(): Promise<Officer>` — throws `NotOfficerError` for signed-out or non-officer; Server Actions catch it and return `{ ok: false, message: "This account isn't an officer" }`
  - `withOfficer<T>(fn: (o: Officer) => Promise<T>): Promise<ActionResult>` — wraps every Server Action: officer check, try/catch, Postgres error translation (`23505` on courses code → `"Another course already uses {code}"`, `42501` → not-officer message), `revalidatePath`.
- Admin layout: signed out → redirect `/login`; signed in, not an officer → page "This account isn't an officer" with Sign out and "Back to the week".
- Header signed in: officer's name, Admin, Sign out.

- [ ] **Step 1: Write the failing unit tests** for `withOfficer` with a stubbed `getOfficer`: `null` → `{ ok: false, message: "This account isn't an officer" }` and `fn` not called; a thrown `{ code: '23505' }` from a course save with code `CNS` → `"Another course already uses CNS"`; success → `{ ok: true }`.
- [ ] **Step 2: Write the failing e2e test:** `/admin` while signed out redirects to `/login`, which shows "Officers sign in with Google".
- [ ] **Step 3–5:** fail, implement, pass.
- [ ] **Step 6:** Manual: Google sign-in as the head officer reaches `/admin/notices`; as a non-listed Google account sees the not-officer page.
- [ ] **Step 7:** Commit `Add officer sign-in`.

---

### Task 10: Admin notices and calendar

**Files:**
- Create: `app/admin/notices/page.tsx`, `app/admin/calendar/page.tsx`, `app/admin/actions/{notices,items}.ts`, `components/forms/{NoticeForm,ItemForm}.tsx`, `components/AdminRow.tsx`, `components/ConfirmDelete.tsx`
- Test: `tests/e2e/admin-notices.spec.ts`

**Interfaces:**
- Consumes: `noticeSchema`, `itemSchema`, `movedFields`, `withOfficer`
- Actions: `saveNotice(fd: FormData)`, `deleteNotice(id)`, `toggleNoticeDone(id)`, `saveItem(fd)`, `deleteItem(id)`. Saving a notice with Calendar = "new" inserts the item first, then the notice with its id; if the notice insert fails, delete the new item.
- Editing: `?edit=<id>` loads the row into the form; the form reads "Edit notice" / "Edit calendar item", with Save changes and Cancel editing; the row is highlighted. Editing an item's date or time applies `movedFields`.
- `AdminRow`: fixed columns `100px minmax(0,1fr) 270px` (code tag, title and details, actions).
- `ConfirmDelete`: `confirm("Delete {title}? This can't be undone.")` before calling the delete action.

- [ ] **Step 1: Write the failing e2e test** (signed in with a test officer session: a Supabase session for a seeded `officer@test.local` user, created by `tests/e2e/auth.setup.ts` using the dev project's service key from `.env.test.local`, never committed): post a notice with "Add new" calendar item → it appears on `/` that week; edit the item's date → card shows "Moved"; delete asks for confirmation and the row disappears.
- [ ] **Step 2–4:** fail, implement, pass.
- [ ] **Step 5:** Commit `Add notices and calendar admin`.

---

### Task 11: Admin classes and one-class cancel

**Files:**
- Create: `app/admin/classes/page.tsx`, `app/admin/actions/slots.ts`, `components/forms/SlotForm.tsx`
- Modify: `components/schedule/DetailsDialog.tsx`
- Test: `tests/e2e/admin-classes.spec.ts`

**Interfaces:**
- Actions: `saveSlot(fd)`, `deleteSlot(id)`, `cancelSlotOn(slotId: string, date: string)` (inserts `no_class` with `class_slot_id`, title "No class"), `restoreSlotOn(itemId: string)`.
- Admin tab label "Class"; list "Weekly classes" grouped by day; row details `"{course name} · {G1|G2} · {room}"`. Form: Course, Day, Group (Whole class / G1 only / G2 only), Starts, Ends, Room.
- DetailsDialog footer, only when `getOfficer()` returned an officer: "Cancel this class on {formatShort(date)} only", or "Restore this class" when cancelled by a one-slot item, or "Cancelled for the whole course. Change it under Admin → Calendar." otherwise.

- [ ] **Step 1: Write the failing e2e test:** add a G2 CNS class on Thursday → shows on `/` tagged G2; as officer, cancel it from its dialog → card shows "Cancelled", next week's same class does not; Restore → back to "Class"; as a visitor the dialog has no "Officers only" footer.
- [ ] **Step 2–4:** fail, implement, pass.
- [ ] **Step 5:** Commit `Add class admin and one-class cancel`.

---

### Task 12: Admin files, courses, semester and officers

**Files:**
- Create: `app/admin/{files,courses,officers}/page.tsx`, `app/admin/actions/{files,courses,term,officers}.ts`, `components/forms/{FileForm,CourseForm,TermForm,OfficerForm}.tsx`
- Test: `tests/e2e/admin-rest.spec.ts`

**Interfaces:**
- Files: course select starts with "General (whole class)"; links only in Phase 1.
- Courses: nine rows, name and code inputs (`maxLength=8`), no add/delete. "Semester" section: Week 1 start (must be a Sunday), number of weeks, breaks list (add/remove, Sunday only).
- Officers (head only; others get a 404 via `notFound()`): add by email, remove, own row has no Remove.

- [ ] **Step 1: Write the failing e2e test:** add a General link file → appears under `/files?course=general`; a `javascript:` URL shows "Links must start with https://"; renaming CNS to `cns2` changes the tag on `/`; duplicate code shows "Another course already uses …"; non-head officer gets 404 on `/admin/officers`.
- [ ] **Step 2–4:** fail, implement, pass.
- [ ] **Step 5:** Commit `Add files, courses, semester and officers admin`.

---

### Task 13: Deploy

**Files:**
- Create: `README.md` (setup steps from spec §11, how to run tests), `vercel.json` only if a setting is needed (expected: none)

- [ ] **Step 1:** Walk the user through spec §11 steps 1–4 (GitHub repo, Supabase `class-hub` live project, Google OAuth client with the Vercel URL and `/auth/callback` as redirect, Vercel project with env vars). The user does every sign-up and enters every secret themselves.
- [ ] **Step 2:** `npx supabase db push` to the live project; the user fills the head officer email in the seed.
- [ ] **Step 3:** Push to GitHub → Vercel builds. `npm test` and `npm run e2e` pass locally against dev first.
- [ ] **Step 4:** Manual on a phone: open the live link, see the week, sign in as officer, post a notice, see it on Schedule; sign in with a non-officer account and see the not-officer page.
- [ ] **Step 5:** Commit `Add README with setup and test steps`.
