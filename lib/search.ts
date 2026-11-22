import type { Course, FileRow, Notice } from "./types";

export type SearchResults = {
  courses: Course[];
  notices: { notice: Notice; course: Course }[];
  files: { file: FileRow; course: Course | null }[];
};

/**
 * Case-insensitive substring search over the site's three readable tables:
 * course name and code, notice title and body, file title. Empty query matches nothing.
 */
export function searchAll(query: string, courses: Course[], notices: Notice[], files: FileRow[]): SearchResults {
  const q = query.trim().toLowerCase();
  if (!q) return { courses: [], notices: [], files: [] };
  const has = (...fields: (string | null | undefined)[]) => fields.some((f) => f?.toLowerCase().includes(q));
  const byId = new Map(courses.map((c) => [c.id, c]));
  return {
    courses: courses.filter((c) => has(c.name, c.code)),
    notices: notices
      .filter((n) => has(n.title, n.body))
      .flatMap((n) => {
        const course = byId.get(n.course_id);
        return course ? [{ notice: n, course }] : [];
      }),
    files: files
      .filter((f) => has(f.title))
      .map((f) => ({ file: f, course: f.course_id ? byId.get(f.course_id) ?? null : null })),
  };
}
