import { describe, expect, it } from "vitest";
import { buildDigest, sendAll, type DigestData } from "@/lib/push";
import { pushSchema } from "@/lib/schemas";
import type { Course, Item, Notice } from "@/lib/types";

const TODAY = "2026-11-16"; // Monday; tomorrow is Tue 17 Nov
const SINCE = "2026-11-15T11:00:00+00:00"; // last summary: Sun 7 PM Manila
const NEW = "2026-11-16T03:00:00+00:00";
const OLD = "2026-11-10T03:00:00+00:00";

const course = (id: string, code: string): Course => ({ id, slot: 1, name: code, code, color: "#000", instructor: "" });
const item = (id: string, over: Partial<Item> = {}): Item => ({
  created_at: OLD, id, course_id: "cns", kind: "quiz_exam", title: id, on_date: "2026-11-17", at_time: null, notes: null,
  moved_from_date: null, moved_from_time: null, class_slot_id: null, lab_group: "", ...over,
});
const notice = (id: string, over: Partial<Notice> = {}): Notice => ({
  created_at: NEW, id, course_id: "cns", title: id, body: "", posted_on: TODAY, pinned: false, done: false,
  calendar_item_id: null, created_by: null, lab_group: "", ...over,
});
const data = (items: Item[] = [], notices: Notice[] = []): DigestData => ({ courses: [course("cns", "CNS"), course("mor", "MOR")], items, notices });
const sub = (over: { courses?: string[]; lab_group?: "" | "G1" | "G2" } = {}) => ({ courses: [], lab_group: "" as const, since: SINCE, ...over });
const lines = (d: ReturnType<typeof buildDigest>) => d?.body.split("\n") ?? [];

describe("buildDigest", () => {
  it("lists tomorrow's quizzes and due dates, with the time when there is one", () => {
    const d = buildDigest(sub(), data([item("Quiz 2", { at_time: "09:00:00" }), item("Paper", { kind: "due" })]), TODAY);
    expect(d?.title).toBe("Class Hub: 2 due or tested tomorrow");
    expect(lines(d)).toEqual(["Tomorrow · CNS Quiz/exam: Quiz 2, 9:00 AM", "Tomorrow · CNS Due: Paper"]);
    expect(d?.url).toBe("/?week=2026-11-15");
  });

  it("adds quizzes and dues created since the last summary, but not older ones or other kinds", () => {
    const d = buildDigest(sub(), data([
      item("Later quiz", { on_date: "2026-11-24", created_at: NEW }),
      item("Old quiz", { on_date: "2026-11-24", created_at: OLD }),
      item("No class", { kind: "no_class", on_date: "2026-11-17" }),
    ]), TODAY);
    expect(lines(d)).toEqual(["New · CNS Quiz/exam: Later quiz (Tue 24 Nov)"]);
    expect(d?.title).toBe("Class Hub: what's new");
  });

  it("keeps only the phone's courses; empty means every course", () => {
    const d = data([item("cns quiz"), item("mor quiz", { course_id: "mor" })]);
    expect(lines(buildDigest(sub({ courses: ["mor"] }), d, TODAY))).toEqual(["Tomorrow · MOR Quiz/exam: mor quiz"]);
    expect(lines(buildDigest(sub(), d, TODAY))).toHaveLength(2);
  });

  it("G1 and G2 phones skip the other group's items; whole-class items reach both", () => {
    const d = data([item("all"), item("g1", { lab_group: "G1" }), item("g2", { lab_group: "G2" })],
      [notice("g2 notice", { lab_group: "G2" })]);
    const titles = (g: "" | "G1" | "G2") => lines(buildDigest(sub({ lab_group: g }), d, TODAY)).map((l) => l.split(": ")[1]);
    expect(titles("G1")).toEqual(["all", "g1"]);
    expect(titles("G2")).toEqual(["all", "g2", "g2 notice"]);
    expect(titles("")).toEqual(["all", "g1", "g2", "g2 notice"]);
  });

  it("lists new notices once: not old, not done, not passed, not when their calendar item is already listed", () => {
    const quiz = item("Quiz 2");
    const past = item("Last week", { on_date: "2026-11-09" });
    const d = buildDigest(sub(), data([quiz, past], [
      notice("Fresh"),
      notice("Old", { created_at: OLD }),
      notice("Done", { done: true }),
      notice("Passed", { calendar_item_id: past.id }),
      notice("About Quiz 2", { calendar_item_id: quiz.id }),
    ]), TODAY);
    expect(lines(d)).toEqual(["Tomorrow · CNS Quiz/exam: Quiz 2", "Notice · CNS: Fresh"]);
  });

  it("opens the notices page for notices only, filtered when there is one", () => {
    expect(buildDigest(sub(), data([], [notice("One")]), TODAY)?.url).toBe("/notices?course=CNS");
    expect(buildDigest(sub(), data([], [notice("A"), notice("B", { course_id: "mor" })]), TODAY)?.url).toBe("/notices");
  });

  it("returns null when there is nothing, and caps the body at four lines", () => {
    expect(buildDigest(sub(), data(), TODAY)).toBeNull();
    const many = buildDigest(sub(), data(["a", "b", "c", "d", "e", "f"].map((t) => item(t))), TODAY);
    expect(lines(many)).toHaveLength(5);
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
