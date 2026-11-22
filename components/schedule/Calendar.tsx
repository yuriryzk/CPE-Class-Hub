"use client";
import { useEffect, useRef } from "react";
import { hourRange } from "@/lib/day";
import { addDays, formatShort } from "@/lib/time";
import { useView } from "./view";
import type { Course, Item } from "@/lib/types";
import { dayTimetable, filterWeek, otherGroup, type WeekData } from "@/lib/week";
import EventCard from "./EventCard";
import Legend from "./Legend";
import { useGroup } from "./GroupSwitch";
import { useViewFilter } from "./ViewFilter";
import s from "./Calendar.module.css";

/** `upcoming`: Next up candidates in order; the first one in the visitor's lab group gets highlighted. */
export type CalendarProps = { week: WeekData; courses: Course[]; sel: string[]; today: string; weekStart: string; upcoming: Item[] };


// The class day runs 7 AM to 8 PM. Blocks are placed in hours from --h0 (7 here; a phone's Week view starts at the
// week's first class, see hourRange); --hr (one hour's height) is set in CSS.
const FIRST = 7 * 60;
const LAST = 20 * 60;
const HOURS = Array.from({ length: (LAST - FIRST) / 60 }, (_, i) => FIRST / 60 + i);
const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;
const at = (min: number) => `calc(var(--hr) * (${min / 60} - var(--h0)))`;

/**
 * The week as a timetable: days across, 7 AM to 8 PM down. Weekly classes are blocks as tall as they last (a cancelled
 * one is left out); timed quizzes and extra classes are marked at their time too. The row under the grid lists each
 * day's one-off items. Phones show three days at a time, scrolled sideways with the hours
 * pinned (the day summary, DaySummary.tsx, is their other view). `wide` draws the full week at desktop width whatever the screen, for the image
 * download.
 */
export default function Calendar({ week, courses, sel, today, weekStart, upcoming, wide }: CalendarProps & { wide?: boolean }) {
  const group = useGroup();
  const vf = useViewFilter(); // the browse filter (ViewFilter chips): narrows this grid only
  const shown = filterWeek(week, vf.courses, vf.groups);
  const nextId = upcoming.find((i) => !otherGroup(i.lab_group, group))?.id ?? null;
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayIdx = days.indexOf(today);
  const view = useView(); // phones only: re-scroll to today when the Week view is shown
  const scroller = useRef<HTMLDivElement>(null);
  const course = (id: string) => courses.find((c) => c.id === id);
  const noticed = (id: string) => shown.notices.some((n) => n.calendar_item_id === id);
  const plan = days.map((d) => dayTimetable(d, shown, sel, group, vf.groups));
  // Phones' Week view trims the grid to this week's hours (applied by CSS only there); hours outside it are marked.
  const range = hourRange(shown, weekStart, vf.groups);
  const trim = { "--h0p": range.first / 60, "--hsp": (range.last - range.first) / 60 } as React.CSSProperties;
  const tone = (i: number) => [i === 0 || i === 6 ? s.we : "", days[i] === today ? s.today : ""].join(" ");

  // Week view opens scrolled to today (Monday in other weeks), just right of the pinned hours.
  const startIdx = todayIdx >= 0 ? todayIdx : 1;
  useEffect(() => {
    const box = scroller.current;
    const head = box?.querySelector<HTMLElement>(`[data-day="${startIdx}"]`);
    const hours = box?.querySelector<HTMLElement>("[data-hours]");
    // Measured on screen, not with offsetLeft (that counts from the nearest positioned parent, not the scroller).
    if (!wide && box && head && hours) box.scrollLeft += head.getBoundingClientRect().left - hours.getBoundingClientRect().right;
  }, [wide, view, startIdx, weekStart]);

  return (
    <section aria-label={wide ? undefined : "Calendar"} className={wide ? s.wide : `${s.live} ${s.week}`}>
      <div className={s.calhd}>
        <h2>Day by day</h2>
        <Legend hint={!wide} />
      </div>
      <div ref={scroller} className={s.calw} tabIndex={wide ? undefined : 0}>
        <div className={`box ${s.tt}`} style={wide ? undefined : trim}>
          <div className={s.corner} />
          <div className={s.axis} aria-hidden="true" data-hours>
            {HOURS.map((h) => <span key={h} style={{ top: at(h * 60) }} data-out={h * 60 < range.first || h * 60 >= range.last ? "" : undefined}>{hourLabel(h)}</span>)}
          </div>
          <div className={s.alsoh}>Also this day</div>
          {days.map((d, i) => {
            const [wd, n] = formatShort(d).split(" ");
            const { blocks, extras } = plan[i];
            const col = { gridColumn: i + 2 };
            return [
              <div key={`h${d}`} className={`${s.dn} ${tone(i)}`} style={col} data-day={i}>
                <b>{n}</b><span>{wd}</span>{d === today && <em>Today</em>}
              </div>,
              <div key={`g${d}`} className={`${s.col} ${tone(i)}`} style={col}>
                {blocks.filter((b) => b.end > FIRST && b.start < LAST).map((b) => {
                  const start = Math.max(b.start, FIRST), end = Math.min(b.end, LAST);
                  const place = {
                    top: at(start), height: `calc(var(--hr) * ${(end - start) / 60} - 3px)`,
                    left: `calc(${(b.lane / b.lanes) * 100}% + 3px)`, width: `calc(${100 / b.lanes}% - 6px)`,
                  };
                  const id = b.e.t === "slot" ? b.e.slot.id : b.e.item.id;
                  // Long classes have room for a two-line name; blocks sharing the column drop the room line.
                  const fit = [s.blk, end - start >= 90 && s.tall, b.lanes > 1 && s.narrow].filter(Boolean).join(" ");
                  return (
                    <EventCard key={id} e={b.e} date={d} course={course(b.e.course)} className={fit} place={place} compact next={b.e.t === "item" && id === nextId} noticed={b.e.t === "item" && noticed(id)} />
                  );
                })}
              </div>,
              <div key={`x${d}`} className={`${s.also} ${tone(i)}`} style={col}>
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
