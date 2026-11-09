"use client";
import { formatLong, formatShort } from "@/lib/time";
import type { Course, Item } from "@/lib/types";
import { openDetail } from "./DetailsDialog";
import { KIND, pgTime } from "./EventCard";
import { useGroup } from "./GroupSwitch";
import { otherGroup } from "@/lib/week";
import s from "./NextUp.module.css";

const when = (d: string, today: string) => {
  const n = Math.round((Date.parse(d) - Date.parse(today)) / 864e5);
  return n === 0 ? "Today" : n === 1 ? "Tomorrow" : n < 7 ? `In ${n} days` : formatShort(d);
};

/** `all`: every upcoming candidate in order; shows the first three in the visitor's lab group. */
export default function NextUp({ items: all, courses, today }: { items: Item[]; courses: Course[]; today: string }) {
  const group = useGroup();
  const items = all.filter((i) => !otherGroup(i.lab_group, group)).slice(0, 3);
  const empty = items.length ? "Nothing else due or tested yet" : "Nothing due or tested from today on";
  return (
    <section className={s.upnext} aria-labelledby="uph">
      <h2 id="uph" className={s.uph}>Next up</h2>
      <div className={s.band}>
        {items.map((x) => {
          const c = courses.find((c) => c.id === x.course_id);
          return (
            <article key={x.id} className={`box ${s.next}`} style={{ "--c": c?.color ?? "#fff" } as React.CSSProperties}>
              <p className={s.lbl}>{KIND[x.kind]} <span>{when(x.on_date, today)}</span></p>
              <h3>{x.title}</h3>
              <p>{c?.name}</p>
              <p className={s.nd}>{formatLong(x.on_date)}{x.at_time && ` at ${pgTime(x.at_time)}`}</p>
              <button type="button" className={s.lk} onClick={() => openDetail({ t: "item", id: x.id })}>See details</button>
            </article>
          );
        })}
        {Array.from({ length: 3 - items.length }, (_, i) => (
          <article key={i} className={`box ${s.next} ${s.none}`}>
            <p className={s.lbl}>Coming up</p>
            <h3>{empty}</h3>
          </article>
        ))}
      </div>
    </section>
  );
}
