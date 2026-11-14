import { loadCourses, loadItemsByIds, loadNotices, LoadError } from "@/lib/data";
import { resolvePicks } from "@/lib/picks";
import { manilaToday } from "@/lib/time";
import { noticesByCourse } from "@/lib/week";
import GroupSwitch from "@/components/schedule/GroupSwitch";
import PicksSync from "@/components/schedule/PicksSync";
import Tabs, { TabPanel } from "@/components/Tabs";
import { noticeRows } from "@/components/notices/NoticeCard";
import NoticeList from "@/components/notices/NoticeList";
import ViewSwitch from "@/components/notices/ViewSwitch";

export const revalidate = 60;

const andList = (l: string[]) => (l.length < 2 ? l.join("") : `${l.slice(0, -1).join(", ")} and ${l[l.length - 1]}`);

export default async function Notices({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const { course } = await searchParams;
  let data;
  try {
    const [courses, notices] = await Promise.all([loadCourses(), loadNotices()]);
    const items = await loadItemsByIds(notices.flatMap((n) => (n.calendar_item_id ? [n.calendar_item_id] : [])));
    data = { courses, notices, items };
  } catch (e) {
    if (!(e instanceof LoadError)) throw e;
    const href = `/notices${course ? `?${new URLSearchParams({ course })}` : ""}`;
    return <main><div className="title"><h1>Notices</h1></div><p className="box empty">Couldn&apos;t load the {e.what}. <a href={href}>Try again.</a></p></main>;
  }
  const { courses, notices, items } = data;
  const today = manilaToday();
  const sel = resolvePicks(course ?? null, null, courses).ids;
  const shown = noticesByCourse(notices.filter((n) => !sel.length || sel.includes(n.course_id)), items, today, courses.map((c) => c.id));
  const rows = noticeRows(shown, courses, items, today);
  const picked = courses.filter((c) => sel.includes(c.id));
  const counts: Record<string, number> = { all: notices.length };
  for (const n of notices) counts[n.course_id] = (counts[n.course_id] ?? 0) + 1;
  const noun = `${rows.length} ${rows.length === 1 ? "notice" : "notices"}`;

  return (
    <main>
      <PicksSync course={course ?? null} courses={courses} />
      <div className="title"><h1>Notices</h1><div className="act"><GroupSwitch /><ViewSwitch /></div></div>
      <Tabs multi label="Show notices from these courses" base="/notices" courses={courses} counts={counts} sel={sel} />
      <TabPanel
        title={picked.length === 0 ? "All courses" : picked.length === 1 ? picked[0].name : andList(picked.map((c) => c.code))}
        count={noun + (picked.length === 0 ? ` across ${courses.length} courses` : picked.length > 1 ? ` across ${picked.length} courses` : "")}
        hint="Tap several courses to see them together"
        color={picked.length === 1 ? picked[0].color : picked.length > 1 ? "#fff" : undefined}
        swatches={picked.length > 1 ? picked.map((c) => c.color) : undefined}
      >
        {rows.length ? <NoticeList rows={rows} /> : <p className="empty">No notices for {picked.length ? andList(picked.map((c) => c.code)) : "any course"} yet.</p>}
      </TabPanel>
    </main>
  );
}
