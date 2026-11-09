import AdminPage from "@/components/AdminPage";
import AdminRow from "@/components/AdminRow";
import CourseForm from "@/components/forms/CourseForm";
import TermForm from "@/components/forms/TermForm";
import { loadCourses, loadFiles, loadNotices, loadSlots, loadTerm } from "@/lib/data";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export default async function AdminCourses() {
  const [courses, slots, notices, files, { term, breaks }] = await Promise.all([loadCourses(), loadSlots(), loadNotices(), loadFiles(), loadTerm()]);
  const of = (rows: { course_id: string | null }[], id: string) => rows.filter((r) => r.course_id === id).length;

  return (
    <AdminPage
      tab="courses"
      form={<><CourseForm courses={courses} /><TermForm key={JSON.stringify([term, breaks])} term={term} breaks={breaks} /></>}
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
