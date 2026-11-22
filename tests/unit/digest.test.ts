import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadDigestData, sendDigests } from "@/lib/digest";
import { buildDigest, type DigestData, type PushSub } from "@/lib/push";
import type { Course, Item, Notice, Slot } from "@/lib/types";

const TODAY = "2026-11-16"; // Monday; tomorrow is Tue 17 Nov

const course = (id: string, code: string): Course => ({ id, slot: 1, name: code, code, color: "#000", instructor: "", course_no: "" });
const slot = (id: string, over: Partial<Slot> = {}): Slot => ({
  id, course_id: "cns", weekday: 2, starts_at: "09:00:00", ends_at: "10:30:00", room: "ER 204", lab_group: "", online: false, ...over,
});
const item = (id: string, over: Partial<Item> = {}): Item => ({
  created_at: "", id, course_id: "cns", kind: "quiz_exam", title: id, on_date: "2026-11-17", at_time: null, notes: null,
  moved_from_date: null, moved_from_time: null, class_slot_id: null, lab_group: "", ...over,
});
const notice = (id: string, over: Partial<Notice> = {}): Notice => ({
  created_at: "", id, course_id: "cns", title: id, body: "", posted_on: "2026-11-17", pinned: false, done: false,
  calendar_item_id: null, created_by: null, lab_group: "", ...over,
});

/** Just enough of the Supabase query builder for loadDigestData's chains (select/order/eq/in/single + await). */
function fakeDb(tables: Record<string, { data: unknown; error?: { message: string } | null }>) {
  return {
    from: (table: string) => {
      const t = tables[table] ?? { data: [] };
      const result = { data: t.data, error: t.error ?? null };
      const b = {
        select: () => b,
        order: () => b,
        eq: () => b,
        in: () => b,
        single: () => Promise.resolve(result),
        then: (res: (v: typeof result) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej),
      };
      return b;
    },
  } as unknown as SupabaseClient;
}

const tables = (over: Record<string, { data: unknown; error?: { message: string } | null }> = {}) => ({
  courses: { data: [course("cns", "CNS")] },
  class_slots: { data: [slot("s1")] },
  calendar_items: { data: [item("Quiz 2")] },
  term: { data: { starts_on: "2026-11-15", week_count: 18 } },
  term_breaks: { data: [] },
  slot_groups: { data: [] },
  notices: { data: [notice("Bring a pen", { calendar_item_id: "Quiz 2" })] },
  ...over,
});

describe("loadDigestData", () => {
  it("assembles tomorrow's slots, items, linked notices, term and breaks into DigestData", async () => {
    const d = await loadDigestData(fakeDb(tables()), TODAY);
    expect(d.courses.map((c) => c.code)).toEqual(["CNS"]);
    expect(d.week.slots.map((s) => s.id)).toEqual(["s1"]);
    expect(d.week.items.map((i) => i.id)).toEqual(["Quiz 2"]);
    expect(d.week.notices.map((n) => n.title)).toEqual(["Bring a pen"]);
    expect(d.week.term).toEqual({ starts_on: "2026-11-15", week_count: 18 });
    expect(d.week.slotChanges).toEqual([]);
    expect(d.week.linkedItems).toEqual([]);
  });

  it("feeds buildDigest the same payload the cron and the test send share", async () => {
    const d = await loadDigestData(fakeDb(tables()), TODAY);
    const digest = buildDigest({ courses: [], lab_group: "" }, d, TODAY);
    expect(digest?.title).toBe("Tomorrow, Tue 17 Nov");
    expect(digest?.body).toContain("CNS class");
    expect(digest?.body).toContain("CNS Quiz/exam: Quiz 2 (notice: Bring a pen)");
  });

  it("throws the database's message when a query fails", async () => {
    await expect(loadDigestData(fakeDb(tables({ term: { data: null, error: { message: "no term" } } })), TODAY))
      .rejects.toThrow("no term");
    await expect(loadDigestData(fakeDb(tables({ notices: { data: null, error: { message: "rls" } } })), TODAY))
      .rejects.toThrow("rls");
  });
});

describe("sendDigests", () => {
  const sub = (endpoint: string): PushSub => ({ endpoint, p256dh: "k", auth: "a", courses: [], lab_group: "" });
  const data: DigestData = {
    courses: [course("cns", "CNS")],
    week: { slots: [slot("s1")], items: [], notices: [], linkedItems: [], term: { starts_on: "2026-11-15", week_count: 18 }, breaks: [], slotChanges: [] },
  };

  it("sends exactly the JSON buildDigest produces — the payload cron and test share", async () => {
    const sent: { endpoint: string; payload: string }[] = [];
    const result = await sendDigests([sub("https://push.example/ok")], data, TODAY, async (s, d) => {
      sent.push({ endpoint: s.endpoint, payload: JSON.stringify(d) });
    });
    expect(result).toEqual({ sent: 1, skipped: 0, failed: 0, gone: [] });
    expect(sent).toEqual([{ endpoint: "https://push.example/ok", payload: JSON.stringify(buildDigest(sub("x"), data, TODAY)) }]);
  });

  it("skips phones with nothing tomorrow and reports gone endpoints", async () => {
    // A G1-only class: the G2 phone has nothing tomorrow, so its digest is skipped before any send.
    const g1only: DigestData = { ...data, week: { ...data.week, slots: [slot("s1", { lab_group: "G1" })] } };
    const subs: PushSub[] = [
      sub("https://push.example/ok"),
      { ...sub("https://push.example/g2"), lab_group: "G2" },
      sub("https://push.example/gone"),
    ];
    const sent: string[] = [];
    const result = await sendDigests(subs, g1only, TODAY, async (s) => {
      if (s.endpoint.endsWith("gone")) throw Object.assign(new Error(), { statusCode: 410 });
      sent.push(s.endpoint);
    });
    expect(sent).toEqual(["https://push.example/ok"]);
    expect(result).toEqual({ sent: 1, skipped: 1, failed: 0, gone: ["https://push.example/gone"] });
  });
});
