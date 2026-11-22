import { describe, expect, it } from "vitest";
import { buildDigest, sendAll, type DigestData } from "@/lib/push";
import { pushSchema } from "@/lib/schemas";
import type { Course, Item, Notice, Slot } from "@/lib/types";

const TODAY = "2026-11-16"; // Monday; tomorrow is Tue 17 Nov (weekday 2), in Week 1
const TERM = { starts_on: "2026-11-15", week_count: 18 };
const BREAKS = [{ starts_on: "2026-12-20", label: "Christmas break" }];

const course = (id: string, code: string): Course => ({ id, slot: 1, name: code, code, color: "#000", instructor: "", course_no: "", archived_in: null });
const slot = (id: string, over: Partial<Slot> = {}): Slot => ({
  id, course_id: "cns", weekday: 2, starts_at: "09:00:00", ends_at: "10:30:00", room: null, lab_group: "", online: false, ...over,
});
const item = (id: string, over: Partial<Item> = {}): Item => ({
  created_at: "", id, course_id: "cns", kind: "quiz_exam", title: id, on_date: "2026-11-17", at_time: null, notes: null,
  moved_from_date: null, moved_from_time: null, class_slot_id: null, lab_group: "", ...over,
});
const notice = (id: string, over: Partial<Notice> = {}): Notice => ({
  created_at: "", id, course_id: "cns", title: id, body: "", posted_on: "2026-11-17", pinned: false, done: false,
  calendar_item_id: null, created_by: null, lab_group: "", ...over,
});
const data = (slots: Slot[] = [], items: Item[] = [], notices: Notice[] = []): DigestData => ({
  courses: [course("cns", "CNS"), course("mor", "MOR")],
  week: { slots, items, notices, linkedItems: [], term: TERM, breaks: BREAKS, slotChanges: [] },
});
const sub = (over: { courses?: string[]; lab_group?: "" | "G1" | "G2" } = {}) => ({ courses: [], lab_group: "" as const, ...over });
const lines = (d: ReturnType<typeof buildDigest>) => d?.body.split("\n") ?? [];

describe("buildDigest", () => {
  it("lists tomorrow's classes and calendar items in time order, with group and room", () => {
    const d = buildDigest(sub(), data(
      [slot("s1", { room: "ER 204" }), slot("s2", { course_id: "mor", starts_at: "07:30:00" }), slot("wed", { weekday: 3 })],
      [item("Quiz 2", { at_time: "13:00:00" })],
    ), TODAY);
    expect(d?.title).toBe("Tomorrow, Tue 17 Nov");
    expect(lines(d)).toEqual(["7:30 AM · MOR class", "9:00 AM · CNS class (ER 204)", "1:00 PM · CNS Quiz/exam: Quiz 2"]);
    expect(d?.url).toBe("/?week=2026-11-15");
  });

  it("says online instead of the room for a class online that day", () => {
    const d = data([slot("s1", { room: "ER 204" })]);
    d.week.slotChanges = [{ slot_id: "s1", on_date: "2026-11-17", lab_group: null, starts_at: null, ends_at: null, online: true, room: null, agenda: null }];
    expect(lines(buildDigest(sub(), d, TODAY))).toEqual(["9:00 AM · CNS class (online)"]);
  });

  it("names a class's agenda and one-day room", () => {
    const d = data([slot("s1", { room: "ER 204" })]);
    d.week.slotChanges = [{ slot_id: "s1", on_date: "2026-11-17", lab_group: null, starts_at: null, ends_at: null, online: null, room: "Lab 3", agenda: "Orientation" }];
    expect(lines(buildDigest(sub(), d, TODAY))).toEqual(["9:00 AM · CNS class: Orientation (Lab 3)"]);
  });

  it("treats picks of courses that no longer exist (a new semester) as every course", () => {
    const d = data([slot("s1")]);
    expect(lines(buildDigest(sub({ courses: ["old-course-id"] }), d, TODAY))).toEqual(["9:00 AM · CNS class"]);
  });

  it("leaves out a cancelled class and its No class item", () => {
    const d = data([slot("s1"), slot("s2", { course_id: "mor" })], [item("No class", { kind: "no_class", class_slot_id: "s1" })]);
    expect(lines(buildDigest(sub(), d, TODAY))).toEqual(["9:00 AM · MOR class"]);
    expect(buildDigest(sub({ courses: ["cns"] }), d, TODAY)).toBeNull(); // only a cancelled class: nothing to send
  });

  it("keeps only the phone's courses; empty means every course", () => {
    const d = data([slot("cns"), slot("mor", { course_id: "mor" })]);
    expect(lines(buildDigest(sub({ courses: ["mor"] }), d, TODAY))).toEqual(["9:00 AM · MOR class"]);
    expect(lines(buildDigest(sub(), d, TODAY))).toHaveLength(2);
  });

  it("G1 and G2 phones skip the other group's classes, items and notices; whole-class ones reach both", () => {
    const d = data(
      [slot("all", { starts_at: "08:00:00" }), slot("g1", { lab_group: "G1", room: "Lab 2" }), slot("g2", { lab_group: "G2", starts_at: "13:00:00" })],
      [item("G2 quiz", { lab_group: "G2", at_time: "15:00:00" }), item("Essay", { kind: "due", at_time: "17:00:00" })],
      [notice("G1 notice", { lab_group: "G1", calendar_item_id: "Essay" })],
    );
    expect(lines(buildDigest(sub({ lab_group: "G1" }), d, TODAY))).toEqual(
      ["8:00 AM · CNS class", "9:00 AM · CNS class (G1, Lab 2)", "5:00 PM · CNS Due: Essay (notice: G1 notice)"]);
    expect(lines(buildDigest(sub({ lab_group: "G2" }), d, TODAY))).toEqual(
      ["8:00 AM · CNS class", "1:00 PM · CNS class (G2)", "3:00 PM · CNS Quiz/exam: G2 quiz", "5:00 PM · CNS Due: Essay"]);
    expect(lines(buildDigest(sub(), d, TODAY))).toHaveLength(5);
  });

  it("shows a notice only on its quiz/exam or due date line; other notices are left out", () => {
    const quiz = item("Quiz 2");
    const extra = item("Makeup lab", { kind: "extra_class", at_time: "17:00:00" });
    const d = buildDigest(sub(), data([], [quiz, extra], [
      notice("Tomorrow's"),
      notice("Bring a pen", { calendar_item_id: quiz.id, posted_on: TODAY }),
      notice("Room change", { calendar_item_id: extra.id }),
      notice("About next week", { calendar_item_id: "elsewhere" }),
    ]), TODAY);
    expect(lines(d)).toEqual(["5:00 PM · CNS Extra class: Makeup lab", "CNS Quiz/exam: Quiz 2 (notice: Bring a pen)"]);
    expect(buildDigest(sub(), data([], [], [notice("Tomorrow's")]), TODAY)).toBeNull();
  });

  it("has no classes in a break week, but still lists that day's items", () => {
    const d = buildDigest(sub(), data([slot("s1")], [item("Verilog", { kind: "due", on_date: "2026-12-22" })]), "2026-12-21");
    expect(lines(d)).toEqual(["CNS Due: Verilog"]);
  });

  it("returns null when tomorrow is empty, and caps the body at six lines", () => {
    expect(buildDigest(sub(), data([slot("wed", { weekday: 3 })]), TODAY)).toBeNull();
    const many = buildDigest(sub(), data([], ["a", "b", "c", "d", "e", "f", "g", "h"].map((t) => item(t))), TODAY);
    expect(lines(many)).toHaveLength(7);
    expect(lines(many).at(-1)).toBe("and 2 more");
  });
});

describe("sendAll", () => {
  const digest = { title: "t", body: "b", url: "/" };
  it("sends, skips empty digests, and reports 404/410 endpoints as gone", async () => {
    const subs = ["ok", "empty", "gone404", "gone410", "down"].map((endpoint) => ({ endpoint }));
    const sent: string[] = [];
    const r = await sendAll(subs, (s) => (s.endpoint === "empty" ? null : digest), async (s) => {
      if (s.endpoint === "gone404") throw Object.assign(new Error(), { statusCode: 404 });
      if (s.endpoint === "gone410") throw Object.assign(new Error(), { statusCode: 410 });
      if (s.endpoint === "down") throw Object.assign(new Error(), { statusCode: 500 });
      sent.push(s.endpoint);
    });
    expect(sent).toEqual(["ok"]);
    expect(r).toEqual({ sent: 1, skipped: 1, failed: 1, gone: ["gone404", "gone410"] });
  });
});

describe("pushSchema", () => {
  const ok = {
    endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "BNc-x_y", auth: "aZ_9-" },
    courses: ["8f14e45f-ceea-467f-a3c5-3f5bd3b4f8f0"], lab_group: "G1",
  };
  it("accepts a browser subscription with choices and refuses bad ones", () => {
    expect(pushSchema.safeParse(ok).success).toBe(true);
    expect(pushSchema.safeParse({ ...ok, endpoint: "http://push.example/x" }).success).toBe(false);
    for (const host of ["updates.push.services.mozilla.com", "web.push.apple.com", "wns2-sg2p.notify.windows.com"])
      expect(pushSchema.safeParse({ ...ok, endpoint: `https://${host}/abc` }).success, host).toBe(true);
    for (const bad of ["https://example.com/x", "https://169.254.169.254/latest", "https://fcm.googleapis.com.evil.io/x", "https://evil.io/fcm.googleapis.com/x"])
      expect(pushSchema.safeParse({ ...ok, endpoint: bad }).success, bad).toBe(false);
    expect(pushSchema.safeParse({ ...ok, lab_group: "G3" }).success).toBe(false);
    expect(pushSchema.safeParse({ ...ok, courses: ["not-a-uuid"] }).success).toBe(false);
    expect(pushSchema.safeParse({ ...ok, keys: { p256dh: "<script>", auth: "a" } }).success).toBe(false);
  });
});
