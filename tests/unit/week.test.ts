import { describe, expect, it } from "vitest";
import type { Item, Notice, Slot } from "@/lib/types";
import {
  dayEntries, dayTimetable, isPastNotice, lanes, movedFields, nextUp, noticesByCourse, sortNotices, termWeek, type WeekData,
} from "@/lib/week";

const term = { starts_on: "2026-11-15", week_count: 18 };
const breaks = [
  { starts_on: "2026-12-20", label: "Christmas break" },
  { starts_on: "2026-12-27", label: "New Year break" },
];
const slot = (id: string, course_id: string, weekday: number, starts_at: string, lab_group: Slot["lab_group"] = ""): Slot =>
  ({ id, course_id, weekday, starts_at, ends_at: "23:00:00", room: null, lab_group });
const item = (id: string, course_id: string, kind: Item["kind"], on_date: string, at_time: string | null = null, class_slot_id: string | null = null, lab_group: Item["lab_group"] = ""): Item =>
  ({ created_at: "", id, course_id, kind, title: id, on_date, at_time, notes: null, moved_from_date: null, moved_from_time: null, class_slot_id, lab_group });
const notice = (id: string, over: Partial<Notice> = {}): Notice =>
  ({ created_at: "", id, course_id: "a", title: id, body: "", posted_on: "2026-11-10", pinned: false, done: false, calendar_item_id: null, created_by: null, lab_group: "", ...over });
const data = (slots: Slot[], items: Item[] = [], notices: Notice[] = []): WeekData => ({ slots, items, notices, linkedItems: [], term, breaks });
const ids = (es: ReturnType<typeof dayEntries>) =>
  es.map((e) => (e.t === "slot" ? e.slot.id : e.item.id));

describe("termWeek", () => {
  it("numbers weeks, labels breaks, null outside the term", () => {
    expect(termWeek("2026-11-15", term, breaks)).toBe(1);
    expect(termWeek("2026-12-13", term, breaks)).toBe(5);
    expect(termWeek("2026-12-20", term, breaks)).toBe("Christmas break");
    expect(termWeek("2026-12-27", term, breaks)).toBe("New Year break");
    expect(termWeek("2027-01-03", term, breaks)).toBe(6);
    expect(termWeek("2027-03-28", term, breaks)).toBe(18);
    expect(termWeek("2027-04-04", term, breaks)).toBeNull();
    expect(termWeek("2026-11-08", term, breaks)).toBeNull();
  });
});

describe("dayEntries", () => {
  it("places no slots in a break week but keeps one-off items", () => {
    const d = data([slot("s", "a", 2, "07:30:00")], [item("due", "a", "due", "2026-12-22")]);
    expect(ids(dayEntries("2026-12-22", d, [], ""))).toEqual(["due"]);
  });

  it("sorts by start time; a cancelled class is left out and its untimed no_class takes its place", () => {
    const d = data(
      [slot("s1", "a", 2, "07:30:00"), slot("s2", "b", 2, "10:30:00")],
      [item("late", "a", "due", "2026-11-17", "13:00:00"), item("nc", "b", "no_class", "2026-11-17")],
    );
    const es = dayEntries("2026-11-17", d, [], "");
    expect(ids(es)).toEqual(["s1", "nc", "late"]);
    expect(es[1].m).toBe(630);
  });

  it("whole-course no_class removes every slot of the course that day", () => {
    const d = data([slot("g1", "a", 2, "08:00:00", "G1"), slot("g2", "a", 2, "10:00:00", "G2")], [item("nc", "a", "no_class", "2026-11-17")]);
    expect(ids(dayEntries("2026-11-17", d, [], ""))).toEqual(["nc"]);
  });

  it("slot-specific no_class removes only that slot and takes its start", () => {
    const d = data([slot("g1", "a", 2, "08:00:00", "G1"), slot("g2", "a", 2, "10:00:00", "G2")], [item("nc", "a", "no_class", "2026-11-17", null, "g1")]);
    const es = dayEntries("2026-11-17", d, [], "");
    expect(ids(es)).toEqual(["nc", "g2"]);
    expect(es[0].m).toBe(480);
  });

  it("group G1 hides G2-only items, keeps whole-class ones", () => {
    const d = data([], [item("all", "a", "due", "2026-11-17"), item("only2", "a", "due", "2026-11-17", null, null, "G2")]);
    expect(ids(dayEntries("2026-11-17", d, [], "G1"))).toEqual(["all"]);
    expect(ids(dayEntries("2026-11-17", d, [], ""))).toEqual(["all", "only2"]);
  });

  it("group G2 hides G1 slots and their no_class items, keeps whole-class slots", () => {
    const d = data(
      [slot("g1", "a", 2, "08:00:00", "G1"), slot("all", "b", 2, "09:00:00")],
      [item("nc", "a", "no_class", "2026-11-17", null, "g1")],
    );
    expect(ids(dayEntries("2026-11-17", d, [], "G2"))).toEqual(["all"]);
  });

  it("filters by selected courses", () => {
    const d = data([slot("sa", "a", 2, "08:00:00"), slot("sc", "cns", 2, "09:00:00")], [], [notice("n", { course_id: "a", posted_on: "2026-11-17" })]);
    expect(ids(dayEntries("2026-11-17", d, ["cns"], ""))).toEqual(["sc"]);
  });

  it("never puts notices on the calendar; a linked one shows through its item", () => {
    const d = data([slot("s", "a", 2, "08:00:00")], [item("i", "a", "due", "2026-11-17")], [
      notice("free", { posted_on: "2026-11-17" }),
      notice("linked", { posted_on: "2026-11-17", calendar_item_id: "i" }),
    ]);
    expect(ids(dayEntries("2026-11-17", d, [], ""))).toEqual(["s", "i"]);
  });
});

describe("dayTimetable", () => {
  const cls = (id: string, course: string, start: string, end: string, lab_group: Slot["lab_group"] = ""): Slot =>
    ({ ...slot(id, course, 2, start, lab_group), ends_at: end });
  const placed = (t: ReturnType<typeof dayTimetable>) =>
    t.blocks.map((b) => `${b.e.t === "slot" ? b.e.slot.id : b.e.item.id} ${b.start}-${b.end} ${b.lane}/${b.lanes}${b.cancelledBy ? " x" : ""}`);

  it("puts classes in the grid by their real times, keeping a cancelled one with the item that cancels it", () => {
    const d = data(
      [cls("lec", "a", "07:30:00", "09:00:00"), cls("lab", "b", "13:00:00", "16:00:00")],
      [item("nc", "b", "no_class", "2026-11-17", null, "lab")],
    );
    const t = dayTimetable("2026-11-17", d, [], "");
    expect(placed(t)).toEqual(["lec 450-540 0/1", "lab 780-960 0/1 x"]);
    expect(t.blocks[1].cancelledBy?.id).toBe("nc");
    expect(t.extras.map((i) => i.id)).toEqual(["nc"]);
  });

  it("lets a quiz during its own course's class take over that class; other timed items get an hour; untimed only below", () => {
    const d = data([cls("lec", "a", "09:00:00", "10:30:00")], [
      item("quiz", "a", "quiz_exam", "2026-11-17", "09:30:00"),
      item("extra", "b", "extra_class", "2026-11-17", "17:00:00"),
      item("due", "a", "due", "2026-11-17"),
    ]);
    const t = dayTimetable("2026-11-17", d, [], "");
    expect(placed(t)).toEqual(["quiz 540-630 0/1", "extra 1020-1080 0/1"]);
    expect(t.extras.map((i) => i.id)).toEqual(["quiz", "extra", "due"]);
  });

  it("keeps a quiz beside another course's class, and away from a cancelled one", () => {
    const d = data([cls("other", "b", "09:00:00", "10:30:00"), cls("off", "a", "13:00:00", "16:00:00")], [
      item("quiz", "a", "quiz_exam", "2026-11-17", "09:00:00"),
      item("late", "a", "quiz_exam", "2026-11-17", "13:00:00"),
      item("nc", "a", "no_class", "2026-11-17", null, "off"),
    ]);
    expect(placed(dayTimetable("2026-11-17", d, [], ""))).toEqual(
      ["other 540-630 0/2", "quiz 540-600 1/2", "off 780-960 0/2 x", "late 780-840 1/2"]);
  });

  it("splits overlapping G1 and G2 labs side by side, but only for the visitor's group when one is picked", () => {
    const d = data([cls("g1", "a", "13:00:00", "16:00:00", "G1"), cls("g2", "a", "13:00:00", "16:00:00", "G2")]);
    expect(placed(dayTimetable("2026-11-17", d, [], ""))).toEqual(["g1 780-960 0/2", "g2 780-960 1/2"]);
    expect(placed(dayTimetable("2026-11-17", d, [], "G2"))).toEqual(["g2 780-960 0/1"]);
  });

  it("follows the course filter and has no classes in a break week", () => {
    const d = data([cls("a1", "a", "08:00:00", "10:00:00"), cls("b1", "b", "08:00:00", "10:00:00")], [item("due", "b", "due", "2026-12-22")]);
    expect(placed(dayTimetable("2026-11-17", d, ["b"], ""))).toEqual(["b1 480-600 0/1"]);
    const brk = dayTimetable("2026-12-22", d, [], "");
    expect(brk.blocks).toEqual([]);
    expect(brk.extras.map((i) => i.id)).toEqual(["due"]);
  });
});

describe("lanes", () => {
  it("gives overlapping runs their own lane count and reuses freed lanes", () => {
    const out = lanes([
      { id: "a", start: 0, end: 60 }, { id: "b", start: 30, end: 90 }, { id: "c", start: 60, end: 120 }, // one run of 3, 2 lanes
      { id: "d", start: 200, end: 260 }, // alone
    ]);
    expect(out.map((x) => `${x.id}:${x.lane}/${x.lanes}`)).toEqual(["a:0/2", "b:1/2", "c:0/2", "d:0/1"]);
  });
});

describe("nextUp", () => {
  const items = [
    item("past-time", "a", "due", "2026-11-10", "13:00:00"),
    item("untimed", "a", "due", "2026-11-10"),
    item("quiz", "a", "quiz_exam", "2026-11-12", "09:00:00"),
    item("yday", "a", "due", "2026-11-09"),
    item("extra", "a", "extra_class", "2026-11-11"),
    item("d4", "a", "due", "2026-11-20"),
  ];
  it("skips passed, earlier and non-deadline items; caps at n", () => {
    expect(nextUp(items, "2026-11-10", 840, []).map((i) => i.id)).toEqual(["untimed", "quiz", "d4"]);
    expect(nextUp(items, "2026-11-10", 840, [], 2).map((i) => i.id)).toEqual(["untimed", "quiz"]);
    expect(nextUp(items, "2026-11-10", 840, ["zzz"])).toEqual([]);
  });
});

describe("notices", () => {
  const items = [item("y", "a", "due", "2026-11-09"), item("t", "a", "due", "2026-11-10")];
  it("isPastNotice", () => {
    expect(isPastNotice(notice("n", { done: true }), items, "2026-11-10")).toBe(true);
    expect(isPastNotice(notice("n", { calendar_item_id: "y" }), items, "2026-11-10")).toBe(true);
    expect(isPastNotice(notice("n", { calendar_item_id: "t" }), items, "2026-11-10")).toBe(false);
    expect(isPastNotice(notice("n"), items, "2026-11-10")).toBe(false);
  });
  it("sortNotices: active, pinned, newest first", () => {
    const ns = [
      notice("old", { posted_on: "2026-11-01" }),
      notice("done", { done: true, pinned: true, posted_on: "2026-11-09" }),
      notice("new", { posted_on: "2026-11-08" }),
      notice("pin", { pinned: true, posted_on: "2026-11-02" }),
    ];
    expect(sortNotices(ns, items, "2026-11-10").map((n) => n.id)).toEqual(["pin", "new", "old", "done"]);
  });
  it("noticesByCourse: course order, then pinned, active before past, soonest first", () => {
    const ns = [
      notice("b-late", { course_id: "b", posted_on: "2026-11-20" }),
      notice("a-done", { course_id: "a", posted_on: "2026-11-01", done: true }),
      notice("a-late", { course_id: "a", posted_on: "2026-11-25" }),
      notice("b-soon", { course_id: "b", posted_on: "2026-11-12" }),
      notice("a-soon", { course_id: "a", posted_on: "2026-11-11" }),
      notice("a-pin", { course_id: "a", posted_on: "2026-11-30", pinned: true }),
    ];
    expect(noticesByCourse(ns, items, "2026-11-10", ["b", "a"]).map((n) => n.id))
      .toEqual(["b-soon", "b-late", "a-pin", "a-soon", "a-late", "a-done"]);
  });
});

describe("movedFields", () => {
  const base = { on_date: "2026-11-10", at_time: "17:00:00", moved_from_date: null, moved_from_time: null };
  it("remembers the first original and clears when moved back", () => {
    const first = movedFields(base, "2026-11-11", null);
    expect(first).toEqual({ moved_from_date: "2026-11-10", moved_from_time: "17:00:00" });
    const moved = { on_date: "2026-11-11", at_time: null, ...first };
    expect(movedFields(moved, "2026-11-12", "09:00:00")).toEqual(first);
    expect(movedFields(moved, "2026-11-10", "17:00:00")).toEqual({ moved_from_date: null, moved_from_time: null });
  });
});
