/** Admin list order: newest added first, or grouped by course (course order, General last, newest first inside). */
export type AdminSort = "recent" | "course";
export const SORT_COOKIE = (list: string) => `admin-sort-${list}`;

export function sortRows<T extends { created_at: string; course_id: string | null }>(rows: T[], sort: AdminSort, courseIds: string[]): T[] {
  const recent = (a: T, b: T) => b.created_at.localeCompare(a.created_at);
  if (sort === "recent") return [...rows].sort(recent);
  const rank = (r: T) => (r.course_id ? courseIds.indexOf(r.course_id) : courseIds.length);
  return [...rows].sort((a, b) => rank(a) - rank(b) || recent(a, b));
}
