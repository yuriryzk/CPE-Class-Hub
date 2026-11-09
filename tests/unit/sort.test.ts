import { describe, expect, it } from "vitest";
import { sortRows } from "@/lib/sort";

const row = (id: string, course_id: string | null, created_at: string) => ({ id, course_id, created_at });
const rows = [
  row("b-old", "b", "2026-11-01T08:00:00+00:00"),
  row("gen", null, "2026-11-09T08:00:00+00:00"),
  row("a-new", "a", "2026-11-08T08:00:00+00:00"),
  row("b-new", "b", "2026-11-07T08:00:00+00:00"),
];

describe("sortRows", () => {
  it("recent: newest added first", () => {
    expect(sortRows(rows, "recent", ["a", "b"]).map((r) => r.id)).toEqual(["gen", "a-new", "b-new", "b-old"]);
  });
  it("course: course order, General last, newest first inside a course", () => {
    expect(sortRows(rows, "course", ["b", "a"]).map((r) => r.id)).toEqual(["b-new", "b-old", "a-new", "gen"]);
  });
});
