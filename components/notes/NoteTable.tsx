import type { CourseNote } from "@/lib/types";
import s from "../notices/NoticeList.module.css";

/** Desktop: course notes as a table; a note shows its text, a link opens in a new tab. */
export default function NoteTable({ notes }: { notes: CourseNote[] }) {
  return (
    <table className={s.tbl}>
      <thead><tr><th scope="col">Title</th><th scope="col">Kind</th><th scope="col">Content</th></tr></thead>
      <tbody>
        {notes.map((n) => (
          <tr key={n.id}>
            <td>{n.title}</td>
            <td>{n.kind === "link" ? "Link" : "Note"}</td>
            <td>{n.kind === "link" ? <a href={n.url ?? ""} target="_blank" rel="noopener">Open link ↗</a> : n.body}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
