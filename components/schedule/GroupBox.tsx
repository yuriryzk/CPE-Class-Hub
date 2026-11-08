import type { Course } from "@/lib/types";
import { Tag } from "./EventCard";
import s from "./GroupBox.module.css";

/** One course's entries on one day, in one box. */
export default function GroupBox({ course, count, children }: { course?: Course; count: number; children: React.ReactNode }) {
  return (
    <div className={s.grp} style={{ "--c": course?.color ?? "#ddd" } as React.CSSProperties} role="group" aria-label={`${course?.name ?? "Course"}, ${count} items`}>
      <p className={s.gh}><Tag c={course} /></p>
      {children}
    </div>
  );
}
