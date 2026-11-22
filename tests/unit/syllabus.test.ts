import { describe, expect, it } from "vitest";
import { findCourse, findDate, findTime, parseSyllabus, type SyllabusCourse } from "@/lib/syllabus";

const courses: SyllabusCourse[] = [
  { id: "cns", code: "CNS", course_no: "CPE 201" },
  { id: "mor", code: "MOR", course_no: "" },
  { id: "pm", code: "PM", course_no: "" },
];
const today = "2026-09-01"; // early in the term, so syllabus dates are upcoming

describe("findDate", () => {
  it("reads ISO, US numeric and month-name dates", () => {
    expect(findDate("Exam 2026-12-10", today)).toBe("2026-12-10");
    expect(findDate("Quiz 10/14", today)).toBe("2026-10-14");
    expect(findDate("Quiz 10/14/2027", today)).toBe("2027-10-14");
    expect(findDate("Quiz Oct 14", today)).toBe("2026-10-14");
    expect(findDate("Quiz October 14, 2026", today)).toBe("2026-10-14");
    expect(findDate("Quiz 14 Oct", today)).toBe("2026-10-14");
    expect(findDate("Quiz 14th of October 2026", today)).toBe("2026-10-14");
  });

  it("rolls a past yearless date to next year, keeps an explicit past year", () => {
    expect(findDate("Due Oct 14", "2026-11-16")).toBe("2027-10-14");
    expect(findDate("Due Oct 14 2026", "2026-11-16")).toBe("2026-10-14");
    expect(findDate("Due Nov 20", today)).toBe("2026-11-20");
  });

  it("rejects impossible dates and non-dates", () => {
    expect(findDate("Due 13/40", today)).toBeNull();
    expect(findDate("Due Feb 30", today)).toBeNull();
    expect(findDate("No date here", today)).toBeNull();
  });
});

describe("findTime", () => {
  it("reads am/pm times with or without minutes", () => {
    expect(findTime("Quiz at 9:00 AM")).toBe("09:00");
    expect(findTime("Due 11:30pm")).toBe("23:30");
    expect(findTime("Exam 12 PM")).toBe("12:00");
    expect(findTime("Midnight 12 AM")).toBe("00:00");
    expect(findTime("No time")).toBeNull();
  });
});

describe("findCourse", () => {
  it("matches codes and course numbers, case-insensitive", () => {
    expect(findCourse("CNS Quiz 1: OSI model", courses)).toBe("cns");
    expect(findCourse("cpe 201 midterm", courses)).toBe("cns");
    expect(findCourse("MOR report draft", courses)).toBe("mor");
  });

  it("does not mistake a time for a course code, or match inside words", () => {
    expect(findCourse("PM class quiz at 2 PM", courses)).toBe("pm"); // first PM is the course
    expect(findCourse("Meeting at 2 PM, quiz", courses)).toBeNull(); // only the time's PM
    expect(findCourse("Economic report due", courses)).toBeNull(); // no ECON code anyway
  });
});

describe("parseSyllabus", () => {
  it("keeps deadline lines and ignores the rest", () => {
    const text = [
      "CS101 Syllabus — Fall 2026",
      "Week 1: introductions and expectations",
      "Quiz 1: OSI model — Oct 14, 2026",
      "MOR research proposal due 10/21",
      "No class Oct 20 (faculty meeting)", // no deadline keyword... 'no class' isn't one
      "CNS midterm exam 2026-12-10 at 9:00 AM",
      "See the LMS for the full calendar",
    ].join("\n");
    const rows = parseSyllabus(text, courses, today);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ title: "Quiz 1: OSI model — Oct 14, 2026", date: "2026-10-14", kind: "quiz_exam", course_id: null });
    expect(rows[1]).toMatchObject({ title: "MOR research proposal due 10/21", date: "2026-10-21", kind: "due", course_id: "mor" });
    expect(rows[2]).toMatchObject({ title: "CNS midterm exam 2026-12-10 at 9:00 AM", date: "2026-12-10", kind: "quiz_exam", course_id: "cns", at_time: "09:00" });
  });

  it("detects different courses on different lines", () => {
    const rows = parseSyllabus("CNS quiz Oct 20\nMOR final Dec 5\nCPE 201 report Nov 30", courses, today);
    expect(rows.map((r) => r.course_id)).toEqual(["cns", "mor", "cns"]);
    expect(rows.map((r) => r.kind)).toEqual(["quiz_exam", "quiz_exam", "due"]);
  });

  it("strips bullets and numbering from titles", () => {
    const rows = parseSyllabus("- Quiz 2 due 11/04\n3. Assignment 3 submission Oct 30", courses, today);
    expect(rows[0].title).toBe("Quiz 2 due 11/04");
    expect(rows[1].title).toBe("Assignment 3 submission Oct 30");
  });

  it("returns nothing for keyword-free or date-free lines", () => {
    expect(parseSyllabus("Office hours: Mondays 2-4 PM\nQuiz (date TBA)", courses, today)).toEqual([]);
  });

  it("dedupes identical deadlines pasted twice", () => {
    const rows = parseSyllabus("Quiz 1 Oct 14\nQuiz 1 Oct 14", courses, today);
    expect(rows).toHaveLength(1);
  });
});
