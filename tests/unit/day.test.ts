import { describe, expect, it } from "vitest";
import type { Item, Slot } from "@/lib/types";
import type { WeekData } from "@/lib/week";
import { attachItems, breakable, capDots, courseCounts, daySummary, hourRange, stripDots, swipeDir } from "@/lib/day";

const term = { starts_on: "2026-11-15", week_count: 18 };
const breaks = [{ starts_on: "2026-12-20", label: "Christmas break" }];
const WEEK = "2026-11-15"; // Sunday; weekday 1 = Monday 16 Nov
const slot = (id: string, course_id: string, weekday: number, starts_at: string, ends_at: string, lab_group: Slot["lab_group"] = ""): Slot =>
  ({ id, course_id, weekday, starts_at, ends_at, room: null, lab_group, online: false });
const item = (id: string, course_id: string, kind: Item["kind"], on_date: string, at_time: string | null = null, class_slot_id: string | null = null, lab_group: Item["lab_group"] = ""): Item =>
  ({ created_at: "", id, course_id, kind, title: id, on_date, at_time, notes: null, moved_from_date: null, moved_from_time: null, class_slot_id, lab_group });
const data = (slots: Slot[], items: Item[] = []): WeekData => ({ slots, items, notices: [], linkedItems: [], term, breaks, slotChanges: [] });

describe("hourRange", () => {
  it("spans the earliest start to the latest end, on whole hours", () => {
    const d = data([slot("a", "x", 1, "08:30:00", "10:00:00"), slot("b", "y", 3, "14:00:00", "16:45:00")]);
    expect(hourRange(d, WEEK)).toEqual({ first: 480, last: 1020 });
  });

  it("keeps at least the last hour of the day when everything starts at 8 PM or later", () => {
    const d = data([], [item("x", "x", "extra_class", "2026-11-17", "21:00:00")]);
    const r = hourRange(d, WEEK);
    expect(r.last - r.first).toBeGreaterThanOrEqual(60);
    expect(r).toEqual({ first: 1140, last: 1200 });
  });

  it("ignores the course filter and lab group", () => {
    const d = data([slot("g2", "x", 2, "07:00:00", "08:00:00", "G2"), slot("b", "y", 2, "10:00:00", "12:00:00")]);
    expect(hourRange(d, WEEK)).toEqual({ first: 420, last: 720 });
  });

  it("leaves out cancelled classes", () => {
    const d = data(
      [slot("early", "x", 2, "07:00:00", "08:00:00"), slot("b", "y", 2, "10:00:00", "12:00:00")],
      [item("nc", "x", "no_class", "2026-11-17")],
    );
    expect(hourRange(d, WEEK)).toEqual({ first: 600, last: 720 });
  });

  it("falls back to 7 AM–8 PM with no blocks, e.g. a break week", () => {
    const d = data([slot("a", "x", 1, "08:30:00", "10:00:00")]);
    expect(hourRange(d, "2026-12-20")).toEqual({ first: 420, last: 1200 });
  });

  it("stays inside 7 AM–8 PM", () => {
    const d = data([slot("a", "x", 1, "06:00:00", "21:30:00")]);
    expect(hourRange(d, WEEK)).toEqual({ first: 420, last: 1200 });
  });
});

describe("daySummary", () => {
  // Tue 17 Nov: G1 lab, a whole-class lecture, a cancelled class and a hand-made No class item.
  const d = data(
    [slot("lab", "cns", 2, "13:00:00", "16:00:00", "G1"), slot("lec", "mor", 2, "09:00:00", "10:30:00"), slot("off", "pm", 2, "07:30:00", "09:00:00")],
    [item("nc", "pm", "no_class", "2026-11-17"), item("hand", "laws", "no_class", "2026-11-17")],
  );
  it("summarises a day: classes in order, first and last, No class count including hand-made items", () => {
    const s = daySummary("2026-11-17", d, [], "");
    expect(s.classes.map((b) => (b.e.t === "slot" ? b.e.slot.id : ""))).toEqual(["lec", "lab"]);
    expect(s.first?.start).toBe(540);
    expect(s.last?.end).toBe(960);
    expect(s.noClass).toBe(2);
  });
  it("follows the course filter and lab group", () => {
    expect(daySummary("2026-11-17", d, ["cns"], "G2").classes).toEqual([]);
    expect(daySummary("2026-11-17", d, ["cns"], "G1").classes).toHaveLength(1);
    expect(daySummary("2026-11-17", d, ["cns"], "").noClass).toBe(0);
  });
  it("is empty on a break day: no classes, first and last null, noClass 0", () => {
    const s = daySummary("2026-12-22", d, [], "");
    expect(s).toMatchObject({ classes: [], first: null, last: null, noClass: 0 });
  });
});

describe("stripDots", () => {
  it("gives one dot per class per day, after filters", () => {
    const d = data([slot("a", "cns", 1, "09:00:00", "10:00:00"), slot("b", "mor", 1, "07:00:00", "08:00:00"), slot("c", "cns", 3, "09:00:00", "10:00:00", "G2")]);
    expect(stripDots(d, WEEK, [], "")).toEqual([[], ["mor", "cns"], [], ["cns"], [], [], []]);
    expect(stripDots(d, WEEK, ["cns"], "G1")).toEqual([[], ["cns"], [], [], [], [], []]);
  });
});

describe("courseCounts", () => {
  it("counts this week's entries per course, ignoring the filter", () => {
    const d = data([slot("a", "cns", 1, "09:00:00", "10:00:00"), slot("c", "cns", 3, "09:00:00", "10:00:00", "G2")], [item("due", "mor", "due", "2026-11-19")]);
    expect(courseCounts(d, WEEK, "")).toEqual({ all: 3, cns: 2, mor: 1 });
    expect(courseCounts(d, WEEK, "G1")).toEqual({ all: 2, cns: 1, mor: 1 });
  });
});

describe("swipeDir", () => {
  it("reads a swipe only when it is mostly sideways and over 50px", () => {
    expect(swipeDir(-80, 10)).toBe(1);
    expect(swipeDir(80, 10)).toBe(-1);
    expect(swipeDir(40, 0)).toBe(0);
    expect(swipeDir(-80, 90)).toBe(0);
  });
});

describe("capDots", () => {
  it("shows up to four dots; past that, three and a count of the rest", () => {
    expect(capDots(["a", "b", "c", "d"])).toEqual({ shown: ["a", "b", "c", "d"], more: 0 });
    expect(capDots(["a", "b", "c", "d", "e"])).toEqual({ shown: ["a", "b", "c"], more: 2 });
    expect(capDots(["a", "b", "c", "d", "e", "f", "g"])).toEqual({ shown: ["a", "b", "c"], more: 4 });
    expect(capDots([])).toEqual({ shown: [], more: 0 });
  });
});

describe("attachItems", () => {
  it("puts a course's untimed items under its first class that day; other items stay apart", () => {
    const d = data(
      [slot("a1", "a", 2, "08:00:00", "09:00:00"), slot("b", "b", 2, "10:00:00", "11:00:00"), slot("a2", "a", 2, "13:00:00", "14:00:00")],
      [item("due-a", "a", "due", "2026-11-17"), item("due-c", "c", "due", "2026-11-17")],
    );
    const sum = daySummary("2026-11-17", d, [], "");
    const { groups, loose } = attachItems(sum.classes, sum.extras.filter((i) => i.kind !== "no_class" && !i.at_time));
    expect(groups.map((g) => [g.b.e.t === "slot" && g.b.e.slot.id, g.items.map((i) => i.id)])).toEqual([["a1", ["due-a"]], ["b", []], ["a2", []]]);
    expect(loose.map((i) => i.id)).toEqual(["due-c"]);
  });
});

describe("breakable", () => {
  it("adds soft hyphens inside long words only, never leaving fewer than three letters after one", () => {
    expect(breakable("Microprocessors")).toBe("Micr­opro­cess­ors");
    expect(breakable("Methods of Research")).toBe("Methods of Research");
    expect(breakable("Microprocessors").replace(/­/g, "")).toBe("Microprocessors");
  });
});

describe("courseCounts groups", () => {
  it("narrows the load by the browse filter's groups", () => {
    const d = data([slot("a", "cns", 1, "09:00:00", "10:00:00", "G1"), slot("c", "cns", 3, "09:00:00", "10:00:00", "G2"), slot("w", "mor", 1, "11:00:00", "12:00:00")]);
    expect(courseCounts(d, WEEK, "", ["G1"])).toEqual({ all: 2, cns: 1, mor: 1 });
    expect(courseCounts(d, WEEK, "", [])).toEqual({ all: 3, cns: 2, mor: 1 });
  });
});
