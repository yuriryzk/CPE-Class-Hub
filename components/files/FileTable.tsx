import type { Course, FileRow } from "@/lib/types";
import s from "../notices/NoticeList.module.css";

export default function FileTable({ files, courses }: { files: FileRow[]; courses: Course[] }) {
  return (
    <table className={s.tbl}>
      <thead><tr><th scope="col">What it is</th><th scope="col">Course</th><th scope="col">Type</th><th scope="col">Week</th><th scope="col">Open</th></tr></thead>
      <tbody>
        {files.map((f) => {
          const c = courses.find((c) => c.id === f.course_id);
          return (
            <tr key={f.id} style={{ "--c": c?.color ?? "var(--ink)" } as React.CSSProperties}>
              <td>{f.title}</td><td>{c?.code ?? "General"}</td><td>{f.file_type}</td><td>{f.week_label ?? "—"}</td>
              <td>{f.url ? <a href={f.url} target="_blank" rel="noopener">Open link ↗</a> : "No file attached"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
