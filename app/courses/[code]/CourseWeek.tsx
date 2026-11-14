"use client";
import EventCard, { timeSpan } from "@/components/schedule/EventCard";
import { useGroup } from "@/components/schedule/GroupSwitch";
import { formatShort, WEEKDAYS } from "@/lib/time";
import type { Course, Item, Slot } from "@/lib/types";
import { otherGroup } from "@/lib/week";
import s from "../courses.module.css";

const when = (d: string, today: string) => {
  const n = Math.round((Date.parse(d) - Date.parse(today)) / 864e5);
  return n === 0 ? "Today" : n === 1 ? "Tomorrow" : formatShort(d);
};

/** A course's weekly classes and what's coming up, for the visitor's lab group (the G1/G2 switch). */
export default function CourseWeek({ course, slots, items, today }: { course: Course; slots: Slot[]; items: Item[]; today: string }) {
  const group = useGroup();
  const classes = slots.filter((x) => !otherGroup(x.lab_group, group))
    .sort((a, b) => a.weekday - b.weekday || a.starts_at.localeCompare(b.starts_at));
  const upcoming = items.filter((x) => !otherGroup(x.lab_group, group));
  return (
    <div className={s.stack}>
      <section aria-labelledby="weekly">
        <div className={s.sec}><h2 id="weekly">Weekly classes</h2></div>
        <div className="box">
          {classes.length ? (
            <ul className={s.list}>
              {classes.map((x) => (
                <li key={x.id}>
                  <span className={s.day}>{WEEKDAYS[x.weekday - 1]}</span>
                  <span>{timeSpan(x)}</span>
                  {x.room && <span className={s.muted}>{x.room}</span>}
                  {x.lab_group && <span className={s.grp}>{x.lab_group}</span>}
                </li>
              ))}
            </ul>
          ) : <p className={s.empty}>No weekly classes{group ? ` for ${group}` : ""} yet.</p>}
        </div>
      </section>
      <section aria-labelledby="coming">
        <div className={s.sec}><h2 id="coming">Coming up</h2></div>
        <div className="box">
          {upcoming.length ? (
            <ul className={`${s.list} ${s.up}`}>
              {upcoming.map((x) => (
                <li key={x.id}>
                  <span className={s.day}>{when(x.on_date, today)}</span>
                  <EventCard e={{ t: "item", item: x, course: x.course_id, m: 0 }} date={x.on_date} course={course} />
                </li>
              ))}
            </ul>
          ) : <p className={s.empty}>Nothing coming up.</p>}
        </div>
      </section>
    </div>
  );
}
