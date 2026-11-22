import { addDays, formatLong, formatTime, fromPgTime } from "@/lib/time";
import { KIND, type Course, type Slot } from "@/lib/types";
import { dayEntries, type Entry, type WeekData } from "@/lib/week";
import s from "./PrintSchedule.module.css";

const pg = (t: string) => formatTime(fromPgTime(t));
/** "7:30–9:00 AM", or "11:00 AM–1:00 PM" across noon. */
const span = (slot: Pick<Slot, "starts_at" | "ends_at">) => {
  const a = pg(slot.starts_at), b = pg(slot.ends_at);
  return `${a.slice(-2) === b.slice(-2) ? a.slice(0, -3) : a}–${b}`;
};

/**
 * The week's schedule as a plain table, one section per day, for paper: hidden on screen
 * (PrintSchedule.module.css) and the only schedule PrintSchedule shows when printing.
 * Lab group "" (Both) prints every group's class, labelled, like the on-screen Both view.
 */
export default function PrintSchedule({ week, courses, sel, weekStart, today, heading, sub }: {
  week: WeekData; courses: Course[]; sel: string[]; weekStart: string; today: string; heading: string; sub: string;
}) {
  const course = (id: string) => courses.find((c) => c.id === id);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const row = (e: Entry) => {
    const c = course(e.course);
    if (e.t === "slot") {
      const sl = e.slot;
      return {
        key: sl.id, time: span(sl), code: c?.code ?? "—", name: sl.agenda ?? c?.name ?? "Course",
        inst: c?.instructor ?? "", where: sl.online ? "Online" : sl.room ?? "",
        note: [sl.agenda && c?.name, sl.lab_group && `Group ${sl.lab_group}`].filter(Boolean).join(" · "),
      };
    }
    const i = e.item;
    const untitled = i.title === KIND[i.kind] && i.notes ? i.notes : i.title;
    return {
      key: i.id, time: i.at_time ? pg(i.at_time) : "", code: c?.code ?? "—", name: untitled,
      inst: c?.instructor ?? "", where: "",
      note: [KIND[i.kind], i.lab_group && `Group ${i.lab_group}`, i.moved_from_date && "Moved"].filter(Boolean).join(" · "),
    };
  };

  return (
    <div className={s.root}>
      <h1 className={s.h}>{heading}</h1>
      <p className={s.sub}>{sub}</p>
      {days.map((d) => {
        const rows = dayEntries(d, week, sel, "").map(row);
        return (
          <section key={d} className={s.day}>
            <h2>{formatLong(d)}{d === today ? " · Today" : ""}</h2>
            {rows.length ? (
              <table>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key}>
                      <td className={s.time}>{r.time}</td>
                      <td className={s.course}><b>{r.code}</b> {r.name}</td>
                      <td className={s.inst}>{r.inst}</td>
                      <td className={s.where}>{r.where}</td>
                      <td className={s.note}>{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className={s.none}>No classes.</p>}
          </section>
        );
      })}
    </div>
  );
}
