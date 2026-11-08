import Link from "next/link";
import { deleteFile } from "@/app/admin/actions/files";
import AdminPage from "@/components/AdminPage";
import AdminRow from "@/components/AdminRow";
import ConfirmDelete from "@/components/ConfirmDelete";
import FileForm from "@/components/forms/FileForm";
import { loadCourses, loadFiles } from "@/lib/data";

export default async function AdminFiles({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const [courses, files] = await Promise.all([loadCourses(), loadFiles()]);
  const editing = files.find((f) => f.id === edit);

  return (
    <AdminPage tab="files" form={<FileForm key={editing?.id ?? "new"} courses={courses} file={editing} />} list="Files" count={files.length}>
      {files.map((f) => {
        const course = courses.find((c) => c.id === f.course_id);
        return (
          <AdminRow
            key={f.id}
            course={course}
            title={f.title}
            details={[course ? null : "General", f.file_type, f.week_label].filter(Boolean).join(" · ")}
            editing={f.id === editing?.id}
            actions={<>
              <Link className="btn s" href={`/admin/files?edit=${f.id}`}>Edit</Link>
              <ConfirmDelete title={f.title} action={deleteFile.bind(null, f.id)} />
            </>}
          />
        );
      })}
    </AdminPage>
  );
}
