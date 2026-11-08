import type { Item, Notice, Slot, Term, TermBreak } from "./types";
import { addDays, fromPgTime, sundayOf, weekdayOf } from "./time";

export type Group = "" | "G1" | "G2";
export type Entry =
  | { t: "slot"; slot: Slot; course: string; m: number; cancelled: boolean }
  | { t: "item"; item: Item; course: string; m: number }
  | { t: "note"; notice: Notice; course: string; m: number };
export type WeekData = { slots: Slot[]; items: Item[]; notices: Notice[]; term: Term; breaks: TermBreak[] };

const UNTIMED = 9000;
const NOTICE = 10000;

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

export function dayEntries(date: string, d: WeekData, sel: string[], group: Group): Entry[] {
  const hidden = (s: Slot | undefined) => !!(s && group && s.lab_group && s.lab_group !== group);
  const isBreak = typeof termWeek(sundayOf(date), d.term, d.breaks) === "string";
  const wd = weekdayOf(date);
  const dayItems = d.items.filter((i) => i.on_date === date);
  const cancels = (s: Slot) =>
    dayItems.some((i) => i.kind === "no_class" && i.course_id === s.course_id && (!i.class_slot_id || i.class_slot_id === s.id));

  const slots: Entry[] = (isBreak ? [] : d.slots)
    .filter((s) => s.weekday === wd && !hidden(s))
    .map((s) => ({ t: "slot", slot: s, course: s.course_id, m: fromPgTime(s.starts_at), cancelled: cancels(s) }));
  const slotOf = (i: Item) => (i.class_slot_id ? d.slots.find((s) => s.id === i.class_slot_id) : undefined);
  const classStart = (course: string) =>
    Math.min(UNTIMED, ...slots.filter((e) => e.course === course).map((e) => e.m));
  const items: Entry[] = dayItems
    .filter((i) => !hidden(slotOf(i)))
    .map((i) => {
      const s = slotOf(i);
      const m = i.at_time ? fromPgTime(i.at_time) : s ? fromPgTime(s.starts_at) : classStart(i.course_id);
      return { t: "item", item: i, course: i.course_id, m };
    });
  const notes: Entry[] = d.notices
    .filter((n) => n.posted_on === date && !n.calendar_item_id)
    .map((n) => ({ t: "note", notice: n, course: n.course_id, m: NOTICE }));

  return [...slots, ...items, ...notes].filter((e) => !sel.length || sel.includes(e.course)).sort((a, b) => a.m - b.m);
}

export function groupByCourse(entries: Entry[]): Entry[][] {
  const g = new Map<string, Entry[]>();
  for (const e of entries) g.set(e.course, [...(g.get(e.course) ?? []), e]);
  return [...g.values()];
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
