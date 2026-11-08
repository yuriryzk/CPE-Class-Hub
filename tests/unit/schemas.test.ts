import { describe, expect, it } from "vitest";
import {
  breakSchema, courseSchema, coursesSchema, fileSchema, itemSchema, noticeSchema, officerSchema, slotSchema, termSchema,
} from "@/lib/schemas";

const msgs = (r: { error?: { issues: { message: string }[] } }) => r.error?.issues.map((i) => i.message) ?? [];

const slot = { course_id: "c1", weekday: "2", starts_at: "7:30 AM", ends_at: "9:00 AM", room: "", lab_group: "G1" };

describe("slotSchema", () => {
  it("converts times to HH:MM:SS", () => {
    expect(slotSchema.parse(slot)).toEqual({
      course_id: "c1", weekday: 2, starts_at: "07:30:00", ends_at: "09:00:00", room: null, lab_group: "G1",
    });
  });
  it("rejects an end before the start", () => {
    const r = slotSchema.safeParse({ ...slot, starts_at: "9:00 AM", ends_at: "7:30 AM" });
    expect(msgs(r)).toContain("End time must be after the start time");
  });
  it("rejects bad time text, weekday and group", () => {
    expect(msgs(slotSchema.safeParse({ ...slot, starts_at: "730" }))).toContain("Use times like 7:30 AM");
    expect(slotSchema.safeParse({ ...slot, weekday: "8" }).success).toBe(false);
    expect(slotSchema.safeParse({ ...slot, lab_group: "G3" }).success).toBe(false);
  });
});

describe("courseSchema", () => {
  it("accepts a valid code and rejects long or odd ones", () => {
    expect(courseSchema.parse({ name: "Networks", code: "CNS-1" })).toEqual({ name: "Networks", code: "CNS-1" });
    expect(msgs(courseSchema.safeParse({ name: "X", code: "TOOLONGCODE" }))).toContain("Codes are up to 8 characters");
    expect(courseSchema.safeParse({ name: "X", code: "A B" }).success).toBe(false);
  });
});

describe("fileSchema", () => {
  const f = { course_id: "", title: "Slides", file_type: "PDF", week_label: "", url: "https://x.com/a" };
  it("maps General to null and empty optionals to null", () => {
    expect(fileSchema.parse(f)).toEqual({ course_id: null, title: "Slides", file_type: "PDF", week_label: null, url: "https://x.com/a" });
  });
  it("requires https", () => {
    for (const url of ["javascript:alert(1)", "http://x.com"]) {
      expect(msgs(fileSchema.safeParse({ ...f, url }))).toContain("Links must start with https://");
    }
  });
});

describe("officerSchema", () => {
  it("trims and lowercases", () => {
    expect(officerSchema.parse({ email: "A@B.COM " })).toEqual({ email: "a@b.com" });
  });
});

describe("itemSchema", () => {
  const i = { course_id: "c1", kind: "due", title: "Lab 1", on_date: "2026-11-20", at_time: "", notes: "" };
  it("parses optional time and notes", () => {
    expect(itemSchema.parse(i)).toMatchObject({ at_time: null, notes: null });
    expect(itemSchema.parse({ ...i, at_time: "1:05 PM" }).at_time).toBe("13:05:00");
  });
  it("rejects unknown kind and bad date", () => {
    expect(itemSchema.safeParse({ ...i, kind: "party" }).success).toBe(false);
    expect(itemSchema.safeParse({ ...i, on_date: "11/20/2026" }).success).toBe(false);
  });
});

describe("noticeSchema", () => {
  const n = { course_id: "c1", title: "Hi", body: "Body", posted_on: "2026-11-16", calendar: "none" };
  it("turns the checkbox into a boolean", () => {
    expect(noticeSchema.parse(n).pinned).toBe(false);
    expect(noticeSchema.parse({ ...n, pinned: "on" }).pinned).toBe(true);
  });
  it("needs an item when linking and item fields when creating", () => {
    expect(noticeSchema.safeParse({ ...n, calendar: "link" }).success).toBe(false);
    expect(noticeSchema.safeParse({ ...n, calendar: "link", calendar_item_id: "abc" }).success).toBe(true);
    expect(noticeSchema.safeParse({ ...n, calendar: "new" }).success).toBe(false);
    expect(noticeSchema.safeParse({ ...n, calendar: "new", new_kind: "due", new_date: "2026-11-20", new_time: "9:00 AM" }).success).toBe(true);
  });
});

describe("termSchema and breakSchema", () => {
  it("require a Sunday", () => {
    expect(termSchema.parse({ starts_on: "2026-11-15", week_count: "18" })).toEqual({ starts_on: "2026-11-15", week_count: 18 });
    expect(termSchema.safeParse({ starts_on: "2026-11-16", week_count: "18" }).success).toBe(false);
    expect(breakSchema.parse({ starts_on: "2026-12-20", label: "Christmas break" }).label).toBe("Christmas break");
    expect(breakSchema.safeParse({ starts_on: "2026-12-21", label: "x" }).success).toBe(false);
  });
});

describe("coursesSchema", () => {
  it("reads the numbered rows and reports errors on the row that has them", () => {
    expect(coursesSchema.parse({ id0: "a", name0: " Math ", code0: "MATH" })).toEqual([{ id: "a", name: "Math", code: "MATH" }]);
    const r = coursesSchema.safeParse({ id0: "a", name0: "Math", code0: "TOOLONGCODE" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["code0"]);
  });
});
