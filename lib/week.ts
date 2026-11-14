import type { Item, Notice, Slot, Term, TermBreak } from "./types";
import { addDays, fromPgTime, sundayOf, weekdayOf } from "./time";

export type Group = "" | "G1" | "G2";
export type Entry =
  | { t: "slot"; slot: Slot; course: string; m: number }
  | { t: "item"; item: Item; course: string; m: number };
export type WeekData = { slots: Slot[]; items: Item[]; notices: Notice[]; /** items the notices link to, in any week; only `items` places things on days */ linkedItems: Item[]; term: Term; breaks: TermBreak[] };

const UNTIMED = 9000;

/** True when the visitor picked a lab group and `g` is the other one. "" (whole class) always shows. */
export const otherGroup = (g: Group, group: Group) => !!(group && g && g !== group);

/** Week number, a break's label, or null outside the term. `weekStart` is a Sunday. */
export function termWeek(weekStart: string, term: Term, breaks: TermBreak[]): number | string | null {
  if (weekStart < term.starts_on) return null;
  const hit = breaks.find((b) => b.starts_on === weekStart);
  if (hit) return hit.label;
  let n = 1;
  for (let d = term.starts_on; d < weekStart; d = addDays(d, 7)) {
    if (!breaks.some((b) => b.starts_on === d)) n++;
  }
  return n <= term.week_count ? n : null;
}

/** A day's weekly classes (none in a break week) and calendar items, both for the visitor's lab group. */
function dayParts(date: string, d: WeekData, group: Group) {
  const hidden = (s: Slot | undefined) => !!s && otherGroup(s.lab_group, group);
  const isBreak = typeof termWeek(sundayOf(date), d.term, d.breaks) === "string";
  const wd = weekdayOf(date);
  const slotOf = (i: Item) => (i.class_slot_id ? d.slots.find((s) => s.id === i.class_slot_id) : undefined);
  const items = d.items.filter((i) => i.on_date === date && !otherGroup(i.lab_group, group) && !hidden(slotOf(i)));
  const slots = (isBreak ? [] : d.slots).filter((s) => s.weekday === wd && !hidden(s));
  /** The "No class" item that cancels this class on this day, if any. */
  const cancelledBy = (s: Slot) =>
    d.items.find((i) => i.on_date === date && i.kind === "no_class" && i.course_id === s.course_id && (!i.class_slot_id || i.class_slot_id === s.id));
  return { slots, items, slotOf, cancelledBy };
}

/** A day as one list in time order (the 7 PM summary and the course counts). A cancelled class is left out; its
 * "No class" item stands in for it at the same time. */
export function dayEntries(date: string, d: WeekData, sel: string[], group: Group): Entry[] {
  const { slots: daySlots, items: dayItems, slotOf, cancelledBy } = dayParts(date, d, group);
  const slots: Entry[] = daySlots
    .filter((s) => !cancelledBy(s))
    .map((s) => ({ t: "slot", slot: s, course: s.course_id, m: fromPgTime(s.starts_at) }));
  const classStart = (course: string) =>
    Math.min(UNTIMED, ...daySlots.filter((s) => s.course_id === course).map((s) => fromPgTime(s.starts_at)));
  const items: Entry[] = dayItems.map((i) => {
    const s = slotOf(i);
    const m = i.at_time ? fromPgTime(i.at_time) : s ? fromPgTime(s.starts_at) : classStart(i.course_id);
    return { t: "item", item: i, course: i.course_id, m };
  });

  return [...slots, ...items].filter((e) => !sel.length || sel.includes(e.course)).sort((a, b) => a.m - b.m);
}

/** shortcut: quizzes and extra classes have a start time but no end, so the timetable draws them an hour long. */
export const TIMED_MIN = 60;
export type Block = { e: Entry; start: number; end: number; lane: number; lanes: number; cancelledBy?: Item };

/**
 * A day for the timetable. `blocks` sit in the time grid: every weekly class (a cancelled one stays, with the item
 * that cancels it) and every timed item except "No class"; a quiz or exam during its course's class replaces it. `extras`, for the row under the grid: all of the day's
 * calendar items, timed ones first by time. Minutes are from midnight.
 */
export function dayTimetable(date: string, d: WeekData, sel: string[], group: Group): { blocks: Block[]; extras: Item[] } {
  const { slots, items, cancelledBy } = dayParts(date, d, group);
  const mine = (course: string) => !sel.length || sel.includes(course);
  const classes = slots.filter((s) => mine(s.course_id)).map((s) => {
    const start = fromPgTime(s.starts_at);
    return { e: { t: "slot", slot: s, course: s.course_id, m: start } as Entry, start, end: fromPgTime(s.ends_at), cancelledBy: cancelledBy(s) };
  });
  const extras = items.filter((i) => mine(i.course_id)).sort((a, b) => (a.at_time ?? "99").localeCompare(b.at_time ?? "99"));
  const taken = new Set<(typeof classes)[number]>();
  const timed = extras.filter((i) => i.at_time && i.kind !== "no_class").map((i) => {
    const start = fromPgTime(i.at_time!);
    // A quiz or exam during its own course's class takes over that class's block.
    const host = i.kind === "quiz_exam"
      ? classes.find((c) => c.e.course === i.course_id && !c.cancelledBy && !taken.has(c) && c.start <= start && start < c.end)
      : undefined;
    if (host) taken.add(host);
    return { e: { t: "item", item: i, course: i.course_id, m: start } as Entry, start: host?.start ?? start, end: host?.end ?? start + TIMED_MIN };
  });
  return { blocks: lanes([...classes.filter((c) => !taken.has(c)), ...timed]), extras };
}

/**
 * Side-by-side lanes for blocks that overlap in time: each block gets the first free lane, and every block in a run of
 * overlapping blocks shares that run's lane count, so they split the column width evenly.
 */
export function lanes<T extends { start: number; end: number }>(xs: T[]): (T & { lane: number; lanes: number })[] {
  const out: (T & { lane: number; lanes: number })[] = [];
  let run: (T & { lane: number; lanes: number })[] = [];
  let runEnd = -1;
  const ends: number[] = [];
  const close = () => {
    const n = Math.max(1, ...run.map((b) => b.lane + 1));
    run.forEach((b) => (b.lanes = n));
    run = [];
    ends.length = 0;
  };
  for (const x of [...xs].sort((a, b) => a.start - b.start || b.end - a.end)) {
    if (x.start >= runEnd) close();
    let lane = ends.findIndex((e) => e <= x.start);
    if (lane < 0) lane = ends.length;
    ends[lane] = x.end;
    const b = { ...x, lane, lanes: 1 };
    run.push(b);
    out.push(b);
    runEnd = Math.max(runEnd, x.end);
  }
  close();
  return out;
}

export function nextUp(items: Item[], todayISO: string, nowMin: number, sel: string[], n = 3): Item[] {
  const min = (i: Item) => (i.at_time ? fromPgTime(i.at_time) : 1440);
  return items
    .filter((i) => (i.kind === "quiz_exam" || i.kind === "due") && (!sel.length || sel.includes(i.course_id)))
    .filter((i) => i.on_date > todayISO || (i.on_date === todayISO && (!i.at_time || min(i) >= nowMin)))
    .sort((a, b) => a.on_date.localeCompare(b.on_date) || min(a) - min(b))
    .slice(0, n);
}

export function isPastNotice(n: Notice, items: Item[], todayISO: string): boolean {
  const linked = n.calendar_item_id ? items.find((i) => i.id === n.calendar_item_id) : undefined;
  return n.done || (!!linked && linked.on_date < todayISO);
}

export function sortNotices(ns: Notice[], items: Item[], todayISO: string): Notice[] {
  const past = (n: Notice) => Number(isPastNotice(n, items, todayISO));
  return [...ns].sort((a, b) => past(a) - past(b) || Number(b.pinned) - Number(a.pinned) || b.posted_on.localeCompare(a.posted_on));
}

/** Notices page order: grouped by course in `courseIds` order; in each course pinned first, past or done last, soonest date first. */
export function noticesByCourse(ns: Notice[], items: Item[], todayISO: string, courseIds: string[]): Notice[] {
  const rank = (n: Notice) => courseIds.indexOf(n.course_id);
  const past = (n: Notice) => Number(isPastNotice(n, items, todayISO));
  return [...ns].sort((a, b) =>
    rank(a) - rank(b) || past(a) - past(b) || Number(b.pinned) - Number(a.pinned) || a.posted_on.localeCompare(b.posted_on));
}

/** New moved_from_* after moving an item to nextDate/nextTime; keeps the first original, clears when back. */
export function movedFields(
  orig: Pick<Item, "on_date" | "at_time" | "moved_from_date" | "moved_from_time">,
  nextDate: string,
  nextTime: string | null,
): { moved_from_date: string | null; moved_from_time: string | null } {
  if (nextDate === orig.on_date && nextTime === orig.at_time) {
    return { moved_from_date: orig.moved_from_date, moved_from_time: orig.moved_from_time };
  }
  const from = orig.moved_from_date ? { date: orig.moved_from_date, time: orig.moved_from_time } : { date: orig.on_date, time: orig.at_time };
  if (from.date === nextDate && from.time === nextTime) return { moved_from_date: null, moved_from_time: null };
  return { moved_from_date: from.date, moved_from_time: from.time };
}
