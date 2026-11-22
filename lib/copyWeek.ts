import { addDays, formatShort, fromPgTime } from "./time";
import { KIND, type Course } from "./types";
import { dayEntries, type Entry, type Group, type WeekData } from "./week";

const pad = (n: number) => String(n).padStart(2, "0");
/** "07:30", 24-hour, for chat paste where AM/PM words cost width. */
const hm = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

const courseOf = (courses: Course[]) => {
  const byId = new Map(courses.map((c) => [c.id, c]));
  return (id: string) => byId.get(id);
};

/** One day-entry as a chat line: "07:30-09:30 CS101 - Room 201 (Prof. X)" or "13:00 Quiz/exam: Quiz 1 · CS101". */
function entryText(e: Entry, course: (id: string) => Course | undefined): string {
  if (e.t === "slot") {
    const s = e.slot, c = course(s.course_id);
    const span = `${hm(fromPgTime(s.starts_at))}-${hm(fromPgTime(s.ends_at))}`;
    const where = [s.online ? "Online" : s.room, s.agenda].filter(Boolean).join(" · ");
    const prof = c?.instructor ? ` (${c.instructor})` : "";
    return `${span} ${c?.code ?? "Class"}${s.lab_group ? ` (${s.lab_group})` : ""}${where ? ` - ${where}` : ""}${prof}`;
  }
  const i = e.item, c = course(i.course_id);
  // A "No class" titled "No class" shows its reason instead, like the cards do.
  const title = i.title === KIND[i.kind] && i.notes ? i.notes : i.title;
  const time = i.at_time ? `${hm(fromPgTime(i.at_time))} ` : "";
  return `${time}${KIND[i.kind]}: ${title}${c ? ` · ${c.code}` : ""}${i.lab_group ? ` (${i.lab_group})` : ""}`;
}

/**
 * The shown week (selected courses and lab group) as plain text for a group chat: a title line, then per day with
 * anything in it a "Mon 17 Nov" header and one indented line per class or calendar item.
 */
export function weekText(week: WeekData, weekStart: string, courses: Course[], sel: string[], group: Group, title: string): string {
  const course = courseOf(courses);
  const lines = [title];
  let any = false;
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const entries = dayEntries(date, week, sel, group);
    if (!entries.length) continue;
    any = true;
    lines.push("", formatShort(date), ...entries.map((e) => `  ${entryText(e, course)}`));
  }
  if (!any) lines.push("", "No classes this week.");
  return lines.join("\n");
}
