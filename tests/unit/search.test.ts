import { describe, expect, it } from "vitest";
import { searchAll } from "@/lib/search";
import type { Course, FileRow, Notice } from "@/lib/types";

const course = (id: string, name: string, code: string): Course => ({ id, slot: 1, name, code, color: "#fff", instructor: "", course_no: "" });
const notice = (id: string, course_id: string, title: string, body: string): Notice => ({ created_at: "", id, course_id, title, body, posted_on: "2026-11-15", pinned: false, done: false, calendar_item_id: null, created_by: null, lab_group: "" });
const file = (id: string, course_id: string | null, title: string): FileRow => ({ created_at: "", id, course_id, title, file_type: "PDF", week_label: null, url: null, storage_path: null, size_bytes: null, mime_type: null });

const courses = [course("c1", "Microprocessors", "MICROP"), course("c2", "Computer Networks and Security", "CNS")];
const notices = [notice("n1", "c2", "Quiz 1 on Tuesday", "Bring a pen."), notice("n2", "c1", "Lab manual out", "Download the packet tracer.")];
const files = [file("f1", "c1", "Lab manual"), file("f2", null, "Class master list")];

describe("searchAll", () => {
  it("empty or blank query matches nothing", () => {
    expect(searchAll("", courses, notices, files)).toEqual({ courses: [], notices: [], files: [] });
    expect(searchAll("   ", courses, notices, files).courses).toEqual([]);
  });
  it("matches course name and code, case-insensitive", () => {
    expect(searchAll("micro", courses, notices, files).courses.map((c) => c.code)).toEqual(["MICROP"]);
    expect(searchAll("CNS", courses, notices, files).courses.map((c) => c.code)).toEqual(["CNS"]);
  });
  it("matches notice title and body, and resolves the course", () => {
    const r = searchAll("pen", courses, notices, files);
    expect(r.notices.map((x) => x.notice.id)).toEqual(["n1"]);
    expect(r.notices[0].course.code).toBe("CNS");
  });
  it("matches file title and keeps General files course-less", () => {
    const r = searchAll("master", courses, notices, files);
    expect(r.files.map((x) => x.file.id)).toEqual(["f2"]);
    expect(r.files[0].course).toBeNull();
  });
  it("rows whose course is gone are dropped, not crashed on", () => {
    const orphan = notice("n9", "gone", "Lost notice", "x");
    expect(searchAll("lost", courses, [...notices, orphan], files).notices).toEqual([]);
  });
});
