import { loadCourses, loadFiles, loadUpcoming, loadWeek, LoadError } from "@/lib/data";
import { resolvePicks } from "@/lib/picks";
import { addDays, formatLong, formatShort, formatUS, manilaNowMinutes, manilaToday, sundayOf } from "@/lib/time";
import type { Course } from "@/lib/types";
import { nextUp, termWeek } from "@/lib/week";
import Calendar from "@/components/schedule/Calendar";
import CourseFilter from "@/components/schedule/CourseFilter";
import DetailsDialog from "@/components/schedule/DetailsDialog";
import DownloadPng from "@/components/schedule/DownloadPng";
import GroupSwitch from "@/components/schedule/GroupSwitch";
import NextUp from "@/components/schedule/NextUp";
import PicksSync from "@/components/schedule/PicksSync";
import PostedThisWeek from "@/components/schedule/PostedThisWeek";
import WeekNav from "@/components/schedule/WeekNav";
import s from "./page.module.css";

export const revalidate = 60;

/** LoadError becomes null so only that block shows the failure; anything else (Unavailable) goes to app/error.tsx. */
const orNull = <T,>(p: Promise<T>) => p.catch((e) => (e instanceof LoadError ? null : Promise.reject(e)));

const isDate = (v: string | undefined): v is string =>
  !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().startsWith(v);

function Failed({ what, href }: { what: string; href: string }) {
  return <p className="box empty">Couldn&apos;t load the {what}. <a href={href}>Try again.</a></p>;
}

const andList = (l: string[]) => (l.length < 2 ? l.join("") : `${l.slice(0, -1).join(", ")} and ${l[l.length - 1]}`);

export default async function Schedule({ searchParams }: { searchParams: Promise<{ week?: string; course?: string }> }) {
  const { week: weekParam, course } = await searchParams;
  const today = manilaToday();
  const weekStart = sundayOf(isDate(weekParam) ? weekParam : today);
  const weekEnd = addDays(weekStart, 6);
  const [courses, week, upcoming, files] = await Promise.all([
    orNull(loadCourses()), orNull(loadWeek(weekStart)), orNull(loadUpcoming(today)), orNull(loadFiles()),
  ]);
  const list: Course[] = courses ?? [];
  const sel = resolvePicks(course ?? null, null, list).ids;
  const here = `/?${new URLSearchParams({ ...(weekParam && { week: weekParam }), ...(course && { course }) })}`;

  const tw = week ? termWeek(weekStart, week.term, week.breaks) : null;
  const heading = typeof tw === "number" ? `Schedule of Week ${tw}` : weekStart === sundayOf(today) ? "This week" : `Week of ${formatShort(weekStart).slice(4)}`;
  const codes = list.filter((c) => sel.includes(c.id)).map((c) => c.code);
  const sub = (typeof tw === "number" ? `${formatUS(weekStart)} to ${formatUS(weekEnd)}` : `${formatLong(weekStart)} to ${formatLong(weekEnd)}`)
    + (typeof tw === "string" ? ` · ${tw}, no classes` : "")
    + (codes.length ? ` · showing ${andList(codes)}` : "");
  const up = upcoming ? nextUp(upcoming, today, manilaNowMinutes(), sel) : null;
  const calProps = week && { week, courses: list, sel, today, weekStart, nextId: up?.[0]?.id ?? null };

  return (
    <main>
      <PicksSync course={course ?? null} courses={list} />
      <div className="title">
        <h1>{heading}</h1>
        <p className="sub">{sub}</p>
        <div className="act">
          <WeekNav weekStart={weekStart} thisWeek={sundayOf(today)} course={course} />
          <GroupSwitch />
          {calProps && <DownloadPng {...calProps} title={`${heading} · ${sub}`} name={typeof tw === "number" ? String(tw) : weekStart} />}
        </div>
      </div>
      {up ? <NextUp items={up} courses={list} today={today} /> : <Failed what="calendar" href={here} />}
      <div className={s.wk}>
        {courses ? <CourseFilter courses={list} sel={sel} week={week} weekStart={weekStart} weekParam={weekParam} /> : <Failed what="courses" href={here} />}
        {calProps ? <Calendar {...calProps} /> : <Failed what="calendar" href={here} />}
      </div>
      {week && (
        <PostedThisWeek
          notices={week.notices.filter((n) => n.posted_on >= weekStart && n.posted_on <= weekEnd && (!sel.length || sel.includes(n.course_id)))}
          items={week.items}
          courses={list}
          today={today}
        />
      )}
      <DetailsDialog week={week} upcoming={upcoming ?? []} courses={list} files={files} />
    </main>
  );
}
