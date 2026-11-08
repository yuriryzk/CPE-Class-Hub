import { serverClient } from "./supabase/server";
import { addDays } from "./time";
import type { Course, FileRow, Item, Notice, Slot, Term, TermBreak } from "./types";
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

export async function loadCourses(): Promise<Course[]> {
  const db = await serverClient();
  return run("courses", db.from("courses").select("*").order("slot"));
}

export async function loadWeek(weekStart: string): Promise<WeekData> {
  const db = await serverClient();
  const weekEnd = addDays(weekStart, 6);
  const [slots, items, term, breaks] = await Promise.all([
    run<Slot[]>("calendar", db.from("class_slots").select("*").order("starts_at")),
    run<Item[]>("calendar", db.from("calendar_items").select("*").gte("on_date", weekStart).lte("on_date", weekEnd)),
    run<Term>("calendar", db.from("term").select("starts_on, week_count").single()),
    run<TermBreak[]>("calendar", db.from("term_breaks").select("starts_on, label").order("starts_on")),
  ]);
  const ids = items.map((i) => i.id);
  const inWeek = `and(posted_on.gte.${weekStart},posted_on.lte.${weekEnd})`;
  const notices = await run<Notice[]>(
    "calendar",
    db.from("notices").select("*").or(ids.length ? `${inWeek},calendar_item_id.in.(${ids.join(",")})` : inWeek),
  );
  return { slots, items, notices, term, breaks };
}

export async function loadUpcoming(today: string): Promise<Item[]> {
  const db = await serverClient();
  return run(
    "calendar",
    db.from("calendar_items").select("*").in("kind", ["quiz_exam", "due"]).gte("on_date", today)
      .order("on_date").order("at_time", { nullsFirst: false }).limit(60),
  );
}

export async function loadNotices(): Promise<Notice[]> {
  const db = await serverClient();
  return run("notices", db.from("notices").select("*").order("posted_on", { ascending: false }));
}

export async function loadFiles(): Promise<FileRow[]> {
  const db = await serverClient();
  return run("files", db.from("files").select("*").order("created_at", { ascending: false }));
}

/** The calendar items notices point at, so Notices can tell which are past. */
export async function loadItemsByIds(ids: string[]): Promise<Item[]> {
  if (!ids.length) return [];
  const db = await serverClient();
  return run("notices", db.from("calendar_items").select("*").in("id", ids));
}

/** Every calendar item, for the admin lists. */
export async function loadItems(): Promise<Item[]> {
  const db = await serverClient();
  return run("calendar", db.from("calendar_items").select("*").order("on_date").order("at_time", { nullsFirst: true }));
}

/** Every weekly class, for the admin list. */
export async function loadSlots(): Promise<Slot[]> {
  const db = await serverClient();
  return run("classes", db.from("class_slots").select("*").order("starts_at"));
}
