import { getOfficer } from "@/lib/auth";
import { loadCourses, loadNoticesForItems, loadUpcoming, loadWeek, LoadError } from "@/lib/data";
import { resolvePicks } from "@/lib/picks";
import { addDays, formatLong, formatShort, formatUS, manilaNowMinutes, manilaToday, sundayOf } from "@/lib/time";
import type { Course } from "@/lib/types";
import { nextUp, sortNotices, termWeek } from "@/lib/week";
import OfflineNote from "@/components/OfflineNote";
import Calendar from "@/components/schedule/Calendar";
import CourseFilter from "@/components/schedule/CourseFilter";
import DetailsDialog from "@/components/schedule/DetailsDialog";
import DaySummary from "@/components/schedule/DaySummary";
import DownloadPng from "@/components/schedule/DownloadPng";
import { noticeRows } from "@/components/notices/NoticeCard";
import FilterSheet from "@/components/schedule/FilterSheet";
import InstallStrip from "@/components/InstallStrip";
import GroupSwitch from "@/components/schedule/GroupSwitch";
import NextUp from "@/components/schedule/NextUp";
import PicksSync from "@/components/schedule/PicksSync";
import WeekDir from "@/components/schedule/WeekDir";
import PostedThisWeek from "@/components/schedule/PostedThisWeek";
import WeekNav from "@/components/schedule/WeekNav";
import ViewFilter from "@/components/schedule/ViewFilter";
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
  const [courses, week, upcoming, officer] = await Promise.all([
    orNull(loadCourses()), orNull(loadWeek(weekStart)), orNull(loadUpcoming(today)), getOfficer(),
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
  // All candidates: NextUp and the calendar drop the other lab group's items in the browser, where the group is known.
  const up = upcoming ? nextUp(upcoming, today, manilaNowMinutes(), sel, upcoming.length) : null;
  const upNotices = (up && (await orNull(loadNoticesForItems(up.map((i) => i.id))))) || [];
  const calProps = week && { week, courses: list, sel, today, weekStart, upcoming: up ?? [] };
  const posted = week ? week.notices.filter((n) => n.posted_on >= weekStart && n.posted_on <= weekEnd && (!sel.length || sel.includes(n.course_id))) : [];
  const weekItems = week ? [...week.items, ...week.linkedItems] : [];

  return (
    <main>
      <OfflineNote />
      <PicksSync course={course ?? null} courses={list} />
      <WeekDir weekStart={weekStart} />
      <DaySummary week={week} courses={list} sel={sel} today={today} weekStart={weekStart} thisWeek={sundayOf(today)}
        tw={tw} upcoming={up} notices={noticeRows(sortNotices(posted, weekItems, today), list, weekItems, today)} course={course} codes={codes} weekParam={weekParam} retry={here} />
      <div className="title dt">
        <h1>{heading}</h1>
        <p className="sub">{sub}</p>
        <div className="act">
          <WeekNav weekStart={weekStart} thisWeek={sundayOf(today)} course={course} />
          <GroupSwitch />
          {calProps && <DownloadPng {...calProps} title={`${heading} · ${sub}`} name={typeof tw === "number" ? String(tw) : weekStart} />}
        </div>
      </div>
      <div className="dt">{up ? <NextUp items={up} courses={list} today={today} wide /> : <Failed what="calendar" href={here} />}</div>
      {/* Desktop's browse filter; phones get the same chips in the Filter sheet */}
      {courses && week && <div className="dt"><ViewFilter courses={list} week={week} weekStart={weekStart} /></div>}
      <div className={`swap ${s.wk}`}>
        {courses ? <div className="dt"><CourseFilter courses={list} sel={sel} week={week} weekStart={weekStart} weekParam={weekParam} /></div> : <Failed what="courses" href={here} />}
        <div className="v-week swap">
          <div key={weekStart} className="wk-in">{calProps ? <Calendar {...calProps} /> : <Failed what="calendar" href={here} />}</div>
          {up && <div className="ph"><NextUp items={up} courses={list} today={today} /></div>}
        </div>
      </div>
      {week && <div className="dt"><PostedThisWeek notices={posted} items={weekItems} courses={list} today={today} /></div>}
      {/* At the end on Schedule, so it never pushes the day off the first screen */}
      <InstallStrip />
      <FilterSheet courses={list} sel={sel} weekParam={weekParam} cal={calProps || null} title={`${heading} · ${sub}`} name={typeof tw === "number" ? String(tw) : weekStart} />
      <DetailsDialog week={week} upcoming={upcoming ?? []} upNotices={upNotices} courses={list} isOfficer={!!officer} />
    </main>
  );
}
