import { formatShort } from "@/lib/time";
import type { Course } from "@/lib/types";
import { groupByCourse, isPastNotice, type Entry, type WeekData } from "@/lib/week";
import EventCard from "./EventCard";
import GroupBox from "./GroupBox";
import s from "./DayColumn.module.css";

type Props = { date: string; entries: Entry[]; week: WeekData; courses: Course[]; today: string; nextId: string | null };

export default function DayColumn({ date, entries, week, courses, today, nextId }: Props) {
  const [wd, day] = formatShort(date).split(" ");
  const weekend = wd === "Sun" || wd === "Sat";
  const course = (id: string) => courses.find((c) => c.id === id);
  const card = (e: Entry, inGroup: boolean, key: string | number) => (
    <EventCard
      key={key}
      e={e}
      date={date}
      course={course(e.course)}
      inGroup={inGroup}
      next={e.t === "item" && e.item.id === nextId}
      noticed={e.t === "item" && week.notices.some((n) => n.calendar_item_id === e.item.id)}
      past={e.t === "note" && isPastNotice(e.notice, week.items, today)}
    />
  );
  const groups = groupByCourse(entries);
  return (
    <div className={[s.day, weekend && s.we, date === today && s.t].filter(Boolean).join(" ")}>
      <div className={s.dn}>
        <b>{day}</b>
        <span>{wd}</span>
        {date === today && <em>Today</em>}
      </div>
      <div className={s.its}>
        {groups.length ? groups.map((g) =>
          g.length === 1 ? card(g[0], false, g[0].course) : (
            <GroupBox key={g[0].course} course={course(g[0].course)} count={g.length}>
              {g.map((e, i) => card(e, true, i))}
            </GroupBox>
          ),
        ) : <p className={s.none}>Free day</p>}
      </div>
    </div>
  );
}
