import AdminPage from "@/components/AdminPage";
import AdminRow from "@/components/AdminRow";
import s from "@/components/Admin.module.css";
import CourseForm from "@/components/forms/CourseForm";
import NewSemesterForm from "@/components/forms/NewSemesterForm";
import TermForm from "@/components/forms/TermForm";
import { requireOfficer } from "@/lib/auth";
import { loadArchivedSemesters, loadCourses, loadFiles, loadItems, loadNotices, loadSlots, loadTerm } from "@/lib/data";
import { formatLong, formatShort } from "@/lib/time";
import Link from "next/link";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export default async function AdminCourses() {
  const [me, courses, slots, notices, files, items, { term, breaks }, archived] = await Promise.all([
    requireOfficer(), loadCourses(), loadSlots(), loadNotices(), loadFiles(), loadItems(), loadTerm(), loadArchivedSemesters(),
  ]);
  const counts = {
    classes: slots.length, items: items.length, notices: notices.length, files: files.filter((f) => f.course_id).length,
  };
  const of = (rows: { course_id: string | null }[], id: string) => rows.filter((r) => r.course_id === id).length;

  return (
    <AdminPage
      tab="courses"
      form={<>
        <CourseForm courses={courses} />
        <TermForm term={term} breaks={breaks} />
        {me.role === "head" && <NewSemesterForm weeks={term.week_count} counts={counts} />}
        {archived.length > 0 && (
          <div className={`box ${s.panel}`}>
            <h2>Archived semesters</h2>
            <p className={s.hint}>Past semesters stay readable in the <Link href="/archive">Archive</Link>.</p>
            <ul className={s.breaks}>
              {archived.map((t) => (
                <li key={t.id}><Link href={`/archive/${t.id}`}>Semester of {formatLong(t.starts_on)} · {t.week_count} weeks · archived {formatShort(t.archived_at.slice(0, 10))}</Link></li>
              ))}
            </ul>
          </div>
        )}
      </>}
      list="Courses"
      count={courses.length}
    >
      {courses.map((c) => (
        <AdminRow
          key={c.id}
          course={c}
          title={c.name}
          details={`${c.instructor ? `${c.instructor} · ` : ""}${plural(of(slots, c.id), "class a week", "classes a week")} · ${plural(of(notices, c.id), "notice", "notices")} · ${plural(of(files, c.id), "file", "files")}`}
          actions={null}
        />
      ))}
    </AdminPage>
  );
}
