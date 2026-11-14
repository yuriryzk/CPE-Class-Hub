import Link from "next/link";
import { Tag } from "@/components/schedule/EventCard";
import { loadCourses, loadSlots, loadUpcoming, LoadError } from "@/lib/data";
import { formatShort, manilaNowMinutes, manilaToday } from "@/lib/time";
import { KIND } from "@/lib/types";
import { nextUp } from "@/lib/week";
import s from "./courses.module.css";

export const revalidate = 60;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** All nine courses as cards: name, course no., instructor, classes a week, and the next quiz or due date. */
export default async function Courses() {
  let data;
  try {
    const today = manilaToday();
    const [courses, slots, upcoming] = await Promise.all([loadCourses(), loadSlots(), loadUpcoming(today)]);
    data = { courses, slots, upcoming, today };
  } catch (e) {
    if (!(e instanceof LoadError)) throw e;
    return <main><div className="title"><h1>Courses</h1></div><p className="box empty">Couldn&apos;t load the {e.what}. <Link href="/courses">Try again.</Link></p></main>;
  }
  const { courses, slots, upcoming, today } = data;
  const now = manilaNowMinutes();

  return (
    <main>
      <div className="title">
        <h1>Courses</h1>
        <p className="sub">{courses.length} courses this semester. Open one for its classes, what&apos;s coming up, notices and files.</p>
      </div>
      <div className={s.grid}>
        {courses.map((c) => {
          const weekly = slots.filter((x) => x.course_id === c.id).length;
          const next = nextUp(upcoming, today, now, [c.id], 1)[0];
          return (
            <Link key={c.id} href={`/courses/${c.code}`} className={`box ${s.card}`} style={{ "--c": c.color } as React.CSSProperties}>
              <div className={s.ch}><Tag c={c} />{c.course_no}</div>
              <div className={s.cb}>
                <h2>{c.name}</h2>
                {c.instructor && <p>{c.instructor}</p>}
                <p>{plural(weekly, "class a week", "classes a week")}</p>
                <p className={s.next}>
                  {next ? <><span>{KIND[next.kind]}</span>{next.title} · {formatShort(next.on_date)}</> : "Nothing due or tested yet"}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
