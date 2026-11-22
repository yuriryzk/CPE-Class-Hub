import { describe, expect, it } from "vitest";
import { weekText } from "@/lib/copyWeek";
import type { Course, Item, Slot } from "@/lib/types";
import type { WeekData } from "@/lib/week";

const course = (id: string, code: string, over: Partial<Course> = {}): Course =>
  ({ id, slot: 1, name: code, code, color: "#fff", instructor: "", course_no: "", ...over });
const slot = (id: string, course_id: string, weekday: number, starts_at: string, ends_at: string, over: Partial<Slot> = {}): Slot =>
  ({ id, course_id, weekday, starts_at, ends_at, room: null, lab_group: "", online: false, ...over });
const item = (id: string, course_id: string, kind: Item["kind"], on_date: string, at_time: string | null = null, over: Partial<Item> = {}): Item =>
  ({ created_at: "", id, course_id, kind, title: id, on_date, at_time, notes: null, moved_from_date: null, moved_from_time: null, class_slot_id: null, lab_group: "", ...over });
const data = (slots: Slot[], items: Item[] = []): WeekData =>
  ({ slots, items, notices: [], linkedItems: [], term: { starts_on: "2026-11-15", week_count: 18 }, breaks: [], slotChanges: [] });

// Week of Sunday 2026-11-15; Monday is the 16th.
describe("weekText", () => {
  it("lists each day's classes and items under a day header", () => {
    const week = data(
      [slot("s1", "a", 1, "07:30:00", "09:30:00", { room: "Room 201" }), slot("s2", "b", 3, "13:00:00", "15:00:00", { online: true })],
      [item("q1", "a", "quiz_exam", "2026-11-18", "10:00:00", { title: "Quiz 1" })],
    );
    const text = weekText(week, "2026-11-15", [course("a", "CS101", { instructor: "Prof. X" }), course("b", "CS102")], [], "", "Week 1");
    expect(text).toBe([
      "Week 1",
      "",
      "Mon 16 Nov",
      "  07:30-09:30 CS101 - Room 201 (Prof. X)",
      "",
      "Wed 18 Nov",
      "  10:00 Quiz/exam: Quiz 1 · CS101",
      "  13:00-15:00 CS102 - Online",
    ].join("\n"));
  });

  it("says so when the week has nothing", () => {
    expect(weekText(data([]), "2026-11-15", [], [], "", "Week 1")).toBe("Week 1\n\nNo classes this week.");
  });

  it("honours the lab group and course filter like the calendar", () => {
    const week = data([slot("g1", "a", 1, "08:00:00", "10:00:00", { lab_group: "G1" }), slot("g2", "a", 1, "10:00:00", "12:00:00", { lab_group: "G2" })]);
    const courses = [course("a", "CS101")];
    expect(weekText(week, "2026-11-15", courses, [], "G1", "W")).toContain("08:00-10:00 CS101 (G1)");
    expect(weekText(week, "2026-11-15", courses, [], "G1", "W")).not.toContain("10:00-12:00");
    expect(weekText(week, "2026-11-15", courses, ["nope"], "", "W")).toBe("W\n\nNo classes this week.");
  });
});
