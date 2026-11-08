import { describe, expect, it } from "vitest";
import type { Item, Notice, Slot } from "@/lib/types";
import {
  dayEntries, groupByCourse, isPastNotice, movedFields, nextUp, sortNotices, termWeek, type WeekData,
} from "@/lib/week";

const term = { starts_on: "2026-11-15", week_count: 18 };
const breaks = [
  { starts_on: "2026-12-20", label: "Christmas break" },
  { starts_on: "2026-12-27", label: "New Year break" },
];
const slot = (id: string, course_id: string, weekday: number, starts_at: string, lab_group: Slot["lab_group"] = ""): Slot =>
  ({ id, course_id, weekday, starts_at, ends_at: "23:00:00", room: null, lab_group });
const item = (id: string, course_id: string, kind: Item["kind"], on_date: string, at_time: string | null = null, class_slot_id: string | null = null): Item =>
  ({ id, course_id, kind, title: id, on_date, at_time, notes: null, moved_from_date: null, moved_from_time: null, class_slot_id });
const notice = (id: string, over: Partial<Notice> = {}): Notice =>
  ({ id, course_id: "a", title: id, body: "", posted_on: "2026-11-10", pinned: false, done: false, calendar_item_id: null, created_by: null, ...over });
const data = (slots: Slot[], items: Item[] = [], notices: Notice[] = []): WeekData => ({ slots, items, notices, term, breaks });
const ids = (es: ReturnType<typeof dayEntries>) =>
  es.map((e) => (e.t === "slot" ? e.slot.id : e.t === "item" ? e.item.id : e.notice.id));

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

  it("sorts by start time; untimed no_class sits at its course's class", () => {
    const d = data(
      [slot("s1", "a", 2, "07:30:00"), slot("s2", "b", 2, "10:30:00")],
      [item("late", "a", "due", "2026-11-17", "13:00:00"), item("nc", "b", "no_class", "2026-11-17")],
    );
    const es = dayEntries("2026-11-17", d, [], "");
    expect(ids(es)).toEqual(["s1", "s2", "nc", "late"]);
    expect(es[1]).toMatchObject({ t: "slot", cancelled: true });
    expect(es[2].m).toBe(630);
  });

  it("whole-course no_class cancels every slot of the course that day", () => {
    const d = data([slot("g1", "a", 2, "08:00:00", "G1"), slot("g2", "a", 2, "10:00:00", "G2")], [item("nc", "a", "no_class", "2026-11-17")]);
    const es = dayEntries("2026-11-17", d, [], "");
    expect(es.filter((e) => e.t === "slot").every((e) => e.t === "slot" && e.cancelled)).toBe(true);
  });

  it("slot-specific no_class cancels only that slot and takes its start", () => {
    const d = data([slot("g1", "a", 2, "08:00:00", "G1"), slot("g2", "a", 2, "10:00:00", "G2")], [item("nc", "a", "no_class", "2026-11-17", null, "g1")]);
    const es = dayEntries("2026-11-17", d, [], "");
    const cx = (id: string) => es.some((e) => e.t === "slot" && e.slot.id === id && e.cancelled);
    expect([cx("g1"), cx("g2")]).toEqual([true, false]);
    expect(es.find((e) => e.t === "item")!.m).toBe(480);
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

  it("adds unlinked notices after timed entries, skips linked ones", () => {
    const d = data([slot("s", "a", 2, "08:00:00")], [item("i", "a", "due", "2026-11-17")], [
      notice("free", { posted_on: "2026-11-17" }),
      notice("linked", { posted_on: "2026-11-17", calendar_item_id: "i" }),
    ]);
    expect(ids(dayEntries("2026-11-17", d, [], ""))).toEqual(["s", "i", "free"]);
  });
});

describe("groupByCourse", () => {
  it("groups by first appearance", () => {
    const e = (course: string, m: number) => ({ t: "note", notice: notice("x"), course, m }) as const;
    const out = groupByCourse([e("A", 450), e("B", 540), e("A", 780)]);
    expect(out.map((g) => g.map((x) => x.course))).toEqual([["A", "A"], ["B"]]);
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
