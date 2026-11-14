"use client";
import { useState } from "react";
import { addDays, formatShort } from "@/lib/time";
import type { Course, Item } from "@/lib/types";
import { dayTimetable, otherGroup, type WeekData } from "@/lib/week";
import EventCard from "./EventCard";
import { useGroup } from "./GroupSwitch";
import s from "./Calendar.module.css";

/** `upcoming`: Next up candidates in order; the first one in the visitor's lab group gets highlighted. */
export type CalendarProps = { week: WeekData; courses: Course[]; sel: string[]; today: string; weekStart: string; upcoming: Item[] };

const KEY: [string, React.CSSProperties][] = [
  ["Class", {}],
  ["Quiz or exam", { background: "#111" }],
  ["Due", { borderStyle: "dashed" }],
  ["No class", { background: "repeating-linear-gradient(135deg,#d9d9d4 0 2px,#fff 2px 6px)" }],
];

// The class day runs 7 AM to 8 PM. Blocks are placed in hours from FIRST; --hr (one hour's height) is set in CSS.
const FIRST = 7 * 60;
const LAST = 20 * 60;
const HOURS = Array.from({ length: (LAST - FIRST) / 60 }, (_, i) => FIRST / 60 + i);
const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;
const at = (min: number) => `calc(var(--hr) * ${(min - FIRST) / 60})`;

/**
 * The week as a timetable: days across, 7 AM to 8 PM down. Weekly classes are blocks as tall as they last (a cancelled
 * one stays, hatched); timed quizzes and extra classes are marked at their time too. The row under the grid lists each
 * day's one-off items. Phones show one day at a time, picked with day tabs. `wide` draws the full week at desktop
 * width whatever the screen, for the image download.
 */
export default function Calendar({ week, courses, sel, today, weekStart, upcoming, wide }: CalendarProps & { wide?: boolean }) {
  const group = useGroup();
  const nextId = upcoming.find((i) => !otherGroup(i.lab_group, group))?.id ?? null;
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayIdx = days.indexOf(today);
  const [picked, pick] = useState(todayIdx >= 0 ? todayIdx : 1); // a weekday index, kept when changing weeks
  const course = (id: string) => courses.find((c) => c.id === id);
  const noticed = (id: string) => week.notices.some((n) => n.calendar_item_id === id);
  const plan = days.map((d) => dayTimetable(d, week, sel, group));
  const on = (i: number) => (wide || i === picked ? { "data-on": "" } : { "data-off": "" });
  const tone = (i: number) => [i === 0 || i === 6 ? s.we : "", days[i] === today ? s.today : ""].join(" ");

  return (
    <section aria-label={wide ? undefined : "Calendar"} className={wide ? s.wide : s.live}>
      <div className={s.calhd}>
        <h2>Day by day</h2>
        <div className={s.key}>
          {KEY.map(([label, style]) => <span key={label}><i style={style} />{label}</span>)}
          {!wide && <span>Tap any card for details</span>}
        </div>
      </div>
      {!wide && (
        <div className={`seg ${s.tabs}`} role="group" aria-label="Day">
          {days.map((d, i) => {
            const [wd, n] = formatShort(d).split(" ");
            return (
              <button key={d} type="button" aria-pressed={i === picked} onClick={() => pick(i)}>
                {wd}<small>{n}</small>
              </button>
            );
          })}
        </div>
      )}
      <div className={s.calw} tabIndex={wide ? undefined : 0}>
        <div className={`box ${s.tt}`}>
          <div className={s.corner} />
          <div className={s.axis} aria-hidden="true">
            {HOURS.map((h) => <span key={h} style={{ top: at(h * 60) }}>{hourLabel(h)}</span>)}
          </div>
          <div className={s.alsoh}>Also this day</div>
          {days.map((d, i) => {
            const [wd, n] = formatShort(d).split(" ");
            const { blocks, extras } = plan[i];
            const col = { gridColumn: i + 2 };
            return [
              <div key={`h${d}`} className={`${s.dn} ${tone(i)}`} style={col} {...on(i)}>
                <b>{n}</b><span>{wd}</span>{d === today && <em>Today</em>}
              </div>,
              <div key={`g${d}`} className={`${s.col} ${tone(i)}`} style={col} {...on(i)}>
                {blocks.filter((b) => b.end > FIRST && b.start < LAST).map((b) => {
                  const start = Math.max(b.start, FIRST), end = Math.min(b.end, LAST);
                  const place = {
                    top: at(start), height: `calc(var(--hr) * ${(end - start) / 60} - 3px)`,
                    left: `calc(${(b.lane / b.lanes) * 100}% + 3px)`, width: `calc(${100 / b.lanes}% - 6px)`,
                  };
                  const id = b.e.t === "slot" ? b.e.slot.id : b.e.item.id;
                  // Long classes have room for a two-line name; blocks sharing the column drop the room line.
                  const fit = [s.blk, end - start >= 120 && s.tall, b.lanes > 1 && s.narrow].filter(Boolean).join(" ");
                  return (
                    <EventCard key={id} e={b.e} date={d} course={course(b.e.course)} className={fit} place={place} compact
                      cancelledBy={b.cancelledBy} next={b.e.t === "item" && id === nextId} noticed={b.e.t === "item" && noticed(id)} />
                  );
                })}
              </div>,
              <div key={`x${d}`} className={`${s.also} ${tone(i)}`} style={col} {...on(i)}>
                {extras.length ? extras.map((x) => (
                  <EventCard key={x.id} e={{ t: "item", item: x, course: x.course_id, m: 0 }} date={d} course={course(x.course_id)}
                    className={s.chip} next={x.id === nextId} noticed={noticed(x.id)} />
                )) : <span className={s.none}>—</span>}
              </div>,
            ];
          })}
        </div>
      </div>
    </section>
  );
}
