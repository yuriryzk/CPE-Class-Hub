import { cookies } from "next/headers";
import { SORT_COOKIE, type AdminSort } from "./sort";
import { serverClient } from "./supabase/server";
import { addDays } from "./time";
import type { ArchivedSemester, Course, FileRow, Item, Notice, Report, Slot, SlotChange, Term, TermBreak } from "./types";
import type { WeekData } from "./week";

/** One block failed to load; the page shows "Couldn't load the {what}. Try again." for that block only. */
export class LoadError extends Error {
  constructor(public what: string) {
    super(`Couldn't load the ${what}`);
  }
}

/** Supabase unreachable or 5xx/540 (paused project). Deliberately not a LoadError, so it reaches app/error.tsx. */
export class Unavailable extends Error {}

type Result<T> = PromiseLike<{ data: T | null; error: { message: string } | null; status: number }>;

async function run<T>(what: string, q: Result<T>): Promise<T> {
  const { data, error, status } = await q;
  if (status === 0 || status >= 500) throw new Unavailable(error?.message ?? `status ${status}`);
  if (error || data === null) throw new LoadError(what);
  return data;
}

type Db = Awaited<ReturnType<typeof serverClient>>;

/** Ids of the live courses; archived ones (past semesters) never mix into the live pages. */
async function activeCourseIds(db: Db): Promise<string[]> {
  const rows = await run<{ id: string }[]>("calendar", db.from("courses").select("id").is("archived_in", null));
  return rows.map((r) => r.id);
}

export async function loadCourses(): Promise<Course[]> {
  const db = await serverClient();
  return run("courses", db.from("courses").select("*").is("archived_in", null).order("slot"));
}

export async function loadWeek(weekStart: string): Promise<WeekData> {
  const db = await serverClient();
  const weekEnd = addDays(weekStart, 6);
  const [courseIds, term, breaks] = await Promise.all([
    activeCourseIds(db),
    run<Term>("calendar", db.from("term").select("starts_on, week_count").single()),
    run<TermBreak[]>("calendar", db.from("term_breaks").select("starts_on, label").order("starts_on")),
  ]);
  if (!courseIds.length) return { slots: [], items: [], notices: [], linkedItems: [], term, breaks, slotChanges: [] };
  const [slots, items] = await Promise.all([
    run<Slot[]>("calendar", db.from("class_slots").select("*").in("course_id", courseIds).order("starts_at")),
    run<Item[]>("calendar", db.from("calendar_items").select("*").in("course_id", courseIds).gte("on_date", weekStart).lte("on_date", weekEnd)),
  ]);
  const slotIds = slots.map((s) => s.id);
  const itemIds = items.map((i) => i.id);
  const inWeek = `and(posted_on.gte.${weekStart},posted_on.lte.${weekEnd})`;
  const [slotChanges, notices] = await Promise.all([
    slotIds.length
      ? run<SlotChange[]>("calendar", db.from("slot_groups").select("slot_id, on_date, lab_group, starts_at, ends_at, online, room, agenda").in("slot_id", slotIds).gte("on_date", weekStart).lte("on_date", weekEnd))
      : Promise.resolve([] as SlotChange[]),
    run<Notice[]>(
      "calendar",
      db.from("notices").select("*").eq("done", false).in("course_id", courseIds)
        .or(itemIds.length ? `${inWeek},calendar_item_id.in.(${itemIds.join(",")})` : inWeek),
    ),
  ]);
  const linkedIds = notices.flatMap((n) => (n.calendar_item_id ? [n.calendar_item_id] : []));
  const linkedItems = await loadItemsByIds(linkedIds);
  return { slots, items, notices, linkedItems, term, breaks, slotChanges };
}

export async function loadUpcoming(today: string): Promise<Item[]> {
  const db = await serverClient();
  const courseIds = await activeCourseIds(db);
  if (!courseIds.length) return [];
  return run(
    "calendar",
    db.from("calendar_items").select("*").in("course_id", courseIds).in("kind", ["quiz_exam", "due"]).gte("on_date", today)
      .order("on_date").order("at_time", { nullsFirst: false }).limit(60),
  );
}

/** Notices linked to the given calendar items, so Next up items show theirs too. Done notices stay on their course page. */
export async function loadNoticesForItems(ids: string[]): Promise<Notice[]> {
  if (!ids.length) return [];
  const db = await serverClient();
  return run("calendar", db.from("notices").select("*").eq("done", false).in("calendar_item_id", ids));
}

export async function loadNotices(): Promise<Notice[]> {
  const db = await serverClient();
  const courseIds = await activeCourseIds(db);
  if (!courseIds.length) return [];
  return run("notices", db.from("notices").select("*").in("course_id", courseIds).order("posted_on", { ascending: false }));
}

export async function loadFiles(): Promise<FileRow[]> {
  const db = await serverClient();
  const courseIds = await activeCourseIds(db);
  // General files (no course) stay live; course files only from live courses.
  const q = db.from("files").select("*").order("created_at", { ascending: false });
  return run("files", courseIds.length ? q.or(`course_id.is.null,course_id.in.(${courseIds.join(",")})`) : q.is("course_id", null));
}

/** The calendar items notices point at, so Notices can tell which are past. */
export async function loadItemsByIds(ids: string[]): Promise<Item[]> {
  if (!ids.length) return [];
  const db = await serverClient();
  return run("notices", db.from("calendar_items").select("*").in("id", ids));
}

/** Every calendar item of the live courses, for the admin lists. */
export async function loadItems(): Promise<Item[]> {
  const db = await serverClient();
  const courseIds = await activeCourseIds(db);
  if (!courseIds.length) return [];
  return run("calendar", db.from("calendar_items").select("*").in("course_id", courseIds).order("on_date").order("at_time", { nullsFirst: true }));
}

/** The newest change to any course, class, calendar item, notice or file. Deletions leave no trace, so they don't count. */
export async function loadLastUpdate(): Promise<string | null> {
  const db = await serverClient();
  const latest = (table: string) =>
    run<{ updated_at: string }[]>("footer", db.from(table).select("updated_at").order("updated_at", { ascending: false }).limit(1));
  const rows = await Promise.all(["courses", "class_slots", "slot_groups", "calendar_items", "notices", "files"].map(latest));
  const times = rows.flat().map((r) => r.updated_at);
  return times.length ? times.reduce((a, b) => (Date.parse(a) > Date.parse(b) ? a : b)) : null;
}

/** The order this browser picked for an admin list; "recent" unless "By course" was chosen. */
export async function loadSort(list: string): Promise<AdminSort> {
  return (await cookies()).get(SORT_COOKIE(list))?.value === "course" ? "course" : "recent";
}

/** Every weekly class of the live courses, for the admin list. */
export async function loadSlots(): Promise<Slot[]> {
  const db = await serverClient();
  const courseIds = await activeCourseIds(db);
  if (!courseIds.length) return [];
  return run("classes", db.from("class_slots").select("*").in("course_id", courseIds).order("starts_at"));
}

/** The semester (Week 1, week count) and its breaks, for the admin Semester section. */
export async function loadTerm(): Promise<{ term: Term; breaks: TermBreak[] }> {
  const db = await serverClient();
  const [term, breaks] = await Promise.all([
    run<Term>("semester", db.from("term").select("starts_on, week_count").single()),
    run<TermBreak[]>("semester", db.from("term_breaks").select("starts_on, label").order("starts_on")),
  ]);
  return { term, breaks };
}

/** Classmates' reports, for officers (others read none): open ones first, newest first. Archived courses' reports stay in the past. */
export async function loadReports(): Promise<Report[]> {
  const db = await serverClient();
  const ids = await activeCourseIds(db);
  if (!ids.length) return [];
  return run("reports", db.from("reports").select("*").in("course_id", ids).order("done").order("created_at", { ascending: false }));
}

/** Past semesters, newest first, for /archive. */
export async function loadArchivedSemesters(): Promise<ArchivedSemester[]> {
  const db = await serverClient();
  return run("archive", db.from("archived_semesters").select("*").order("starts_on", { ascending: false }));
}

export type ArchivedSemesterData = {
  term: ArchivedSemester;
  courses: Course[];
  slots: Slot[];
  items: Item[];
  slotChanges: SlotChange[];
  notices: Notice[];
  files: FileRow[];
};

/** One archived semester with everything its courses kept: classes, one-day changes, calendar items, notices and files. */
export async function loadArchivedSemester(id: string): Promise<ArchivedSemesterData | null> {
  const db = await serverClient();
  const q = await db.from("archived_semesters").select("*").eq("id", id).maybeSingle();
  if (q.status === 0 || q.status >= 500) throw new Unavailable(q.error?.message ?? `status ${q.status}`);
  if (q.error) throw new LoadError("archive");
  if (!q.data) return null;
  const term = q.data as ArchivedSemester;
  const courses = await run<Course[]>("archive", db.from("courses").select("*").eq("archived_in", id).order("slot"));
  const courseIds = courses.map((c) => c.id);
  const empty = <T,>() => Promise.resolve([] as T);
  const [slots, items, notices, files] = await Promise.all([
    courseIds.length ? run<Slot[]>("archive", db.from("class_slots").select("*").in("course_id", courseIds).order("starts_at")) : empty<Slot[]>(),
    courseIds.length ? run<Item[]>("archive", db.from("calendar_items").select("*").in("course_id", courseIds).order("on_date").order("at_time", { nullsFirst: true })) : empty<Item[]>(),
    courseIds.length ? run<Notice[]>("archive", db.from("notices").select("*").in("course_id", courseIds).order("posted_on", { ascending: false })) : empty<Notice[]>(),
    courseIds.length ? run<FileRow[]>("archive", db.from("files").select("*").in("course_id", courseIds).order("created_at", { ascending: false })) : empty<FileRow[]>(),
  ]);
  const slotIds = slots.map((s) => s.id);
  const slotChanges = slotIds.length
    ? await run<SlotChange[]>("archive", db.from("slot_groups").select("slot_id, on_date, lab_group, starts_at, ends_at, online, room, agenda").in("slot_id", slotIds))
    : [];
  return { term, courses, slots, items, slotChanges, notices, files };
}
