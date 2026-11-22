"use client";
import { useSyncExternalStore } from "react";
import chip from "@/components/CourseChips.module.css";
import { courseCounts } from "@/lib/day";
import { parseGroupSet, toggle } from "@/lib/picks";
import type { Course } from "@/lib/types";
import { type GroupSet, type WeekData } from "@/lib/week";
import { useGroup } from "./GroupSwitch";
import s from "./ViewFilter.module.css";

export const VIEW_COURSES_KEY = "classhub.view.courses";
export const VIEW_GROUPS_KEY = "classhub.view.groups";
const EVENT = "classhub:viewFilter";

/** The schedule's browse filter: courses ([] = all) and lab groups ([] = all), saved in this browser. */
export type ViewFilter = { courses: string[]; groups: GroupSet };
const ALL: ViewFilter = { courses: [], groups: [] };

const readCourses = (): string[] => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(VIEW_COURSES_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
};
const read = (): ViewFilter => ({ courses: readCourses(), groups: parseGroupSet(localStorage.getItem(VIEW_GROUPS_KEY)) });

// One cached snapshot so useSyncExternalStore sees a stable value between changes.
let cache: ViewFilter | null = null;
const snapshot = () => (cache ??= read());
const onChange = (cb: () => void) => {
  const h = () => {
    cache = null;
    cb();
  };
  window.addEventListener(EVENT, h);
  window.addEventListener("storage", h);
  return () => {
    window.removeEventListener(EVENT, h);
    window.removeEventListener("storage", h);
  };
};

function set(next: ViewFilter) {
  // Both groups picked is the same as none picked: keep one spelling.
  const groups = next.groups.length > 1 ? [] : next.groups;
  try {
    if (next.courses.length) localStorage.setItem(VIEW_COURSES_KEY, JSON.stringify(next.courses));
    else localStorage.removeItem(VIEW_COURSES_KEY);
    if (groups.length) localStorage.setItem(VIEW_GROUPS_KEY, groups.join(","));
    else localStorage.removeItem(VIEW_GROUPS_KEY);
  } catch {}
  cache = null;
  window.dispatchEvent(new Event(EVENT));
}

/** The browse filter as this browser saved it; everything on the server and for other tabs' first paint. */
export const useViewFilter = () => useSyncExternalStore(onChange, snapshot, (): ViewFilter => ALL);

const toggleGroup = (groups: GroupSet, g: "G1" | "G2"): GroupSet =>
  groups.includes(g) ? groups.filter((x) => x !== g) : [...groups, g];

type Props = { courses: Course[]; week?: WeekData | null; weekStart?: string };

/**
 * Browse-side narrowing of the already-loaded week: tap courses and/or lab groups to hide the rest of the
 * grid. Independent of "Your courses" (the picks) and the G1/G2 switch — those still apply on top. The
 * choice is kept in this browser; counts ignore the course pick so every course shows its load.
 */
export default function ViewFilter({ courses, week, weekStart }: Props) {
  const vf = useViewFilter();
  const group = useGroup();
  const counts = week && weekStart ? courseCounts(week, weekStart, group, vf.groups) : null;
  return (
    <div className={s.wrap}>
      <div className={`${chip.chips} ${s.row}`} role="group" aria-label="Show courses">
        <button type="button" className={chip.all} aria-pressed={!vf.courses.length} onClick={() => set({ ...vf, courses: [] })}>
          <i aria-hidden="true" />All{counts && <small>{counts.all}</small>}
        </button>
        {courses.map((c) => (
          <button key={c.id} type="button" title={c.name} aria-pressed={vf.courses.includes(c.id)}
            onClick={() => set({ ...vf, courses: toggle(vf.courses, c.id, courses.length) })}>
            <i style={{ "--c": c.color } as React.CSSProperties} aria-hidden="true" />{c.code}{counts && <small>{counts[c.id] ?? 0}</small>}
          </button>
        ))}
      </div>
      <div className={`${chip.chips} ${s.row}`} role="group" aria-label="Show lab groups">
        <span className={s.tag}>Groups</span>
        <button type="button" aria-pressed={!vf.groups.length} onClick={() => set({ ...vf, groups: [] })}>All</button>
        {(["G1", "G2"] as const).map((g) => (
          <button key={g} type="button" aria-pressed={vf.groups.includes(g)} onClick={() => set({ ...vf, groups: toggleGroup(vf.groups, g) })}>{g}</button>
        ))}
      </div>
    </div>
  );
}
