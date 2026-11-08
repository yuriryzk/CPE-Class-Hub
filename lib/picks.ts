import type { Course } from "./types";
import type { Group } from "./week";

export const PICKS_KEY = "classhub.picks";
export const GROUP_KEY = "classhub.group";

type PickCourse = Pick<Course, "id" | "code" | "slot">;

/** `ids` sorted by slot; [] means All. `save` is true when the link carried courses. */
export function resolvePicks(
  linkCodes: string | null,
  savedIds: string[] | null,
  courses: PickCourse[],
): { ids: string[]; save: boolean } {
  const bySlot = (ids: string[]) =>
    courses.filter((c) => ids.includes(c.id)).sort((a, b) => a.slot - b.slot).map((c) => c.id);
  if (linkCodes !== null) {
    const codes = linkCodes.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    return { ids: bySlot(courses.filter((c) => codes.includes(c.code.toLowerCase())).map((c) => c.id)), save: true };
  }
  return { ids: bySlot(savedIds ?? []), save: false };
}

export function toggle(ids: string[], id: string | "all", total: number): string[] {
  if (id === "all") return [];
  const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
  return next.length >= total ? [] : next;
}

export function codesParam(ids: string[], courses: PickCourse[]): string | null {
  if (!ids.length) return null;
  return courses.filter((c) => ids.includes(c.id)).sort((a, b) => a.slot - b.slot).map((c) => c.code).join(",");
}

export const parseGroup = (v: string | null): Group => (v === "G1" || v === "G2" ? v : "");
