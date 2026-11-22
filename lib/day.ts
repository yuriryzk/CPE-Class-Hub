import { addDays } from "./time";
import type { Item } from "./types";
import { dayEntries, dayTimetable, type Block, type Group, type GroupSet, type WeekData } from "./week";

const DAY_FIRST = 7 * 60;
const DAY_LAST = 20 * 60;

/**
 * The hours a phone's Week timetable shows: from the week's earliest block to its latest, on whole hours, inside
 * 7 AM–8 PM. The course picks don't count (the week arrives pre-filtered); `groups` narrows like the grid does.
 */
export function hourRange(week: WeekData, weekStart: string, groups: GroupSet = []): { first: number; last: number } {
  const blocks = Array.from({ length: 7 }, (_, i) => dayTimetable(addDays(weekStart, i), week, [], "", groups).blocks).flat();
  if (!blocks.length) return { first: DAY_FIRST, last: DAY_LAST };
  // Clamped inside the day, keeping at least an hour even when everything starts at 8 PM or later.
  const first = Math.min(DAY_LAST - 60, Math.max(DAY_FIRST, Math.floor(Math.min(...blocks.map((b) => b.start)) / 60) * 60));
  const last = Math.ceil(Math.max(...blocks.map((b) => b.end)) / 60) * 60;
  return { first, last: Math.min(DAY_LAST, Math.max(last, first + 60)) };
}

export type DaySummary = { classes: Block[]; extras: Item[]; first: Block | null; last: Block | null; noClass: number };

/** One day for the phone summary: its timed blocks in start order, its one-off items, and the counts the dials show. */
export function daySummary(date: string, week: WeekData, sel: string[], group: Group, groups: GroupSet = []): DaySummary {
  const { blocks, extras } = dayTimetable(date, week, sel, group, groups);
  const classes = [...blocks].sort((a, b) => a.start - b.start || a.end - b.end);
  const last = classes.reduce<Block | null>((l, b) => (!l || b.end > l.end ? b : l), null);
  return { classes, extras, first: classes[0] ?? null, last, noClass: extras.filter((i) => i.kind === "no_class").length };
}

/** The week strip's dots: for each of the 7 days, the course of each block, in start order. */
export function stripDots(week: WeekData, weekStart: string, sel: string[], group: Group, groups: GroupSet = []): string[][] {
  return Array.from({ length: 7 }, (_, i) => daySummary(addDays(weekStart, i), week, sel, group, groups).classes.map((b) => b.e.course));
}

/** This week's entries per course (and "all"), ignoring the course filter, so every course shows its load. */
export function courseCounts(week: WeekData, weekStart: string, group: Group, groups: GroupSet = []): Record<string, number> {
  const every = Array.from({ length: 7 }, (_, i) => dayEntries(addDays(weekStart, i), week, [], group, groups)).flat();
  const counts: Record<string, number> = { all: every.length };
  for (const e of every) counts[e.course] = (counts[e.course] ?? 0) + 1;
  return counts;
}

/** A finished drag as a swipe: 1 = left (to the next), -1 = right (to the previous), 0 = not a swipe. */
export const swipeDir = (dx: number, dy: number): -1 | 0 | 1 => (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : -1) : 0);

/** A day's strip dots fit four to a cell; past four, three dots and a "+N" for the rest keep the cell from growing. */
export const capDots = <T,>(dots: T[]): { shown: T[]; more: number } =>
  dots.length <= 4 ? { shown: dots, more: 0 } : { shown: dots.slice(0, 3), more: dots.length - 3 };

/** Day view: each untimed item (a due date, say) goes under its course's first class that day, so a course reads as
 * one group; items whose course has no class that day stay apart (`loose`). */
export function attachItems(classes: Block[], items: Item[]): { groups: { b: Block; items: Item[] }[]; loose: Item[] } {
  const first = new Map<string, Block>();
  for (const b of classes) if (!first.has(b.e.course)) first.set(b.e.course, b);
  return {
    groups: classes.map((b) => ({ b, items: first.get(b.e.course) === b ? items.filter((i) => i.course_id === b.e.course) : [] })),
    loose: items.filter((i) => !first.has(i.course_id)),
  };
}

/**
 * Timetable cards are narrow on phones: long words ("Microprocessors") get hidden break points (soft hyphens) so they wrap
 * as "Micropro-cessors" instead of ending in "…" after a few letters. Automatic hyphenation isn't on every device.
 */
export const breakable = (s: string) => s.replace(/\p{L}{10,}/gu, (w) => w.replace(/(\p{L}{4})(?=\p{L}{3})/gu, "$1\u00AD"));
