"use client";
import { addDays } from "@/lib/time";
import type { Course, Item } from "@/lib/types";
import { dayEntries, otherGroup, type WeekData } from "@/lib/week";
import DayColumn from "./DayColumn";
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

/** `wide` draws all seven days at desktop width whatever the screen, for the image download. */
export default function Calendar({ week, courses, sel, today, weekStart, upcoming, wide }: CalendarProps & { wide?: boolean }) {
  const group = useGroup();
  const nextId = upcoming.find((i) => !otherGroup(i.lab_group, group))?.id ?? null;
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  return (
    <section aria-label={wide ? undefined : "Calendar"} className={wide ? s.wide : undefined}>
      <div className={s.calhd}>
        <h2>Day by day</h2>
        <div className={s.key}>
          {KEY.map(([label, style]) => <span key={label}><i style={style} />{label}</span>)}
          {!wide && <span>Tap any card for details</span>}
        </div>
      </div>
      <div className={s.calw} tabIndex={wide ? undefined : 0}>
        <div className={`box ${s.cal}`}>
          {days.map((d) => (
            <DayColumn key={d} date={d} entries={dayEntries(d, week, sel, group)} week={week} courses={courses} today={today} nextId={nextId} />
          ))}
        </div>
      </div>
    </section>
  );
}
