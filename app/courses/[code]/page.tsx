import Link from "next/link";
import FileTable from "@/components/files/FileTable";
import { noticeRows } from "@/components/notices/NoticeCard";
import NoticeList from "@/components/notices/NoticeList";
import DetailsDialog from "@/components/schedule/DetailsDialog";
import { Tag } from "@/components/schedule/EventCard";
import GroupSwitch from "@/components/schedule/GroupSwitch";
import { getOfficer } from "@/lib/auth";
import { loadCourses, loadFiles, loadItems, loadNotices, loadSlots, LoadError } from "@/lib/data";
import { manilaToday } from "@/lib/time";
import { noticesByCourse } from "@/lib/week";
import s from "../courses.module.css";
import CourseWeek from "./CourseWeek";

export const revalidate = 60;

/** One course: its details, weekly classes, what's coming up, notices and files. */
export default async function CoursePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const href = `/courses/${encodeURIComponent(code)}`;
  let data;
  try {
    const [courses, slots, items, notices, files, officer] = await Promise.all([
      loadCourses(), loadSlots(), loadItems(), loadNotices(), loadFiles(), getOfficer().catch(() => null),
    ]);
    data = { courses, slots, items, notices, files, officer };
  } catch (e) {
    if (!(e instanceof LoadError)) throw e;
    return <main><div className="title"><h1>Courses</h1></div><p className="box empty">Couldn&apos;t load the {e.what}. <a href={href}>Try again.</a></p></main>;
  }
  const { courses, slots, items, notices, files, officer } = data;
  const course = courses.find((c) => c.code.toLowerCase() === decodeURIComponent(code).toLowerCase());
  // A friendly page rather than notFound(): the loading screen has already started the response.
  if (!course) {
    return (
      <main>
        <p className={s.back}><Link href="/courses">← All courses</Link></p>
        <div className="title"><h1>No such course</h1></div>
        <p className="box empty">There&apos;s no course with the code {decodeURIComponent(code)}. <Link href="/courses">See all courses.</Link></p>
      </main>
    );
  }

  const today = manilaToday();
  const upcoming = items
    .filter((x) => x.course_id === course.id && x.on_date >= today)
    .sort((a, b) => a.on_date.localeCompare(b.on_date) || (a.at_time ?? "99").localeCompare(b.at_time ?? "99"));
  const own = notices.filter((n) => n.course_id === course.id);
  const rows = noticeRows(noticesByCourse(own, items, today, [course.id]), courses, items, today);
  const ownFiles = files.filter((f) => f.course_id === course.id);
  const weekly = slots.filter((x) => x.course_id === course.id);

  return (
    <main>
      <p className={s.back}><Link href="/courses">← All courses</Link></p>
      <div className={`box ${s.hero}`} style={{ "--c": course.color } as React.CSSProperties}>
        <div>
          <p><Tag c={course} />{course.course_no && <> &nbsp;{course.course_no}</>}</p>
          <h1>{course.name}</h1>
          {course.instructor && <p>{course.instructor}</p>}
        </div>
        <div className={s.act}><GroupSwitch /></div>
      </div>

      <div className={s.cols}>
        <CourseWeek course={course} slots={weekly} items={upcoming} today={today} />
        <section aria-labelledby="notices">
          <div className={s.sec}><h2 id="notices">Notices</h2><Link href={`/notices?course=${course.code}`}>Open in Notices</Link></div>
          <div className="box">
            {rows.length ? <NoticeList rows={rows} /> : <p className={s.empty}>No notices for {course.code} yet.</p>}
          </div>
        </section>
      </div>

      <section aria-labelledby="files">
        <div className={s.sec}><h2 id="files">Files</h2><Link href={`/files?course=${course.code}`}>Open in Files</Link></div>
        <div className={`box ${s.files}`}>
          {ownFiles.length ? <FileTable files={ownFiles} courses={courses} /> : <p className={s.empty}>No files for {course.code} yet.</p>}
        </div>
      </section>

      <DetailsDialog week={null} upcoming={upcoming} upNotices={own} courses={courses} files={files} isOfficer={!!officer} />
    </main>
  );
}
