import Link from "next/link";
import { deleteCourseNote } from "@/app/admin/actions/notes";
import AdminPage from "@/components/AdminPage";
import AdminRow from "@/components/AdminRow";
import ConfirmDelete from "@/components/ConfirmDelete";
import NoteForm from "@/components/forms/NoteForm";
import { loadCourses, loadCourseNotes, loadSort } from "@/lib/data";
import { sortRows } from "@/lib/sort";

export default async function AdminNotes({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const [courses, notes, sort] = await Promise.all([loadCourses(), loadCourseNotes(), loadSort("notes")]);
  const editing = notes.find((n) => n.id === edit);

  return (
    <AdminPage tab="notes" form={<NoteForm key={editing?.id ?? "new"} courses={courses} note={editing} />} list="Notes" count={notes.length} sort={sort}>
      {sortRows(notes, sort, courses.map((c) => c.id)).map((n) => {
        const course = courses.find((c) => c.id === n.course_id);
        return (
          <AdminRow
            key={n.id}
            course={course}
            title={n.title}
            details={[n.kind === "link" ? "Link" : "Note", n.body?.slice(0, 80) ?? n.url].filter(Boolean).join(" · ")}
            editing={n.id === editing?.id}
            actions={<>
              <Link className="btn s" href={`/admin/notes?edit=${n.id}`}>Edit</Link>
              <ConfirmDelete title={n.title} action={deleteCourseNote.bind(null, n.id)} />
            </>}
          />
        );
      })}
    </AdminPage>
  );
}
