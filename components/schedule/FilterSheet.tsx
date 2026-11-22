"use client";
import { useEffect, useRef } from "react";
import CourseChips from "@/components/CourseChips";
import { courseCounts } from "@/lib/day";
import type { Course } from "@/lib/types";
import type { CalendarProps } from "./Calendar";
import DownloadPng from "./DownloadPng";
import GroupSwitch, { useGroup } from "./GroupSwitch";
import { FILTER_EVENT } from "./HeaderTools";
import Legend from "./Legend";
import ViewFilter from "./ViewFilter";
import s from "./FilterSheet.module.css";

type Props = { courses: Course[]; sel: string[]; weekParam?: string; cal: CalendarProps | null; title: string; name: string };

/** Phones: the courses, lab group, legend and image download, in a sheet opened by the header's Filter button. */
export default function FilterSheet({ courses, sel, weekParam, cal, title, name }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const group = useGroup();
  useEffect(() => {
    const open = () => { if (!ref.current?.open) ref.current?.showModal(); };
    window.addEventListener(FILTER_EVENT, open);
    return () => window.removeEventListener(FILTER_EVENT, open);
  }, []);
  const counts = cal ? courseCounts(cal.week, cal.weekStart, group) : {};
  return (
    <dialog ref={ref} className={`ph ${s.sheet}`} aria-labelledby="fsh"
      onClick={(e) => { if (e.target === ref.current) ref.current.close(); }}>
      <div className={s.hd}>
        <h2 id="fsh">Filter</h2>
        <button type="button" className="btn s" onClick={() => ref.current?.close()}>Done</button>
      </div>
      <h3>Courses</h3>
      {/* Every course, even in a break week when none has anything to count */}
      <CourseChips multi every label="Courses" base="/" courses={courses} counts={counts} sel={sel} keep={weekParam ? { week: weekParam } : undefined} />
      <h3>Lab group</h3>
      <GroupSwitch />
      <h3>Show only</h3>
      <ViewFilter courses={courses} week={cal?.week} weekStart={cal?.weekStart} />
      <h3>Key</h3>
      <Legend />
      {cal && <div className={s.dl}><DownloadPng {...cal} title={title} name={name} /></div>}
    </dialog>
  );
}
