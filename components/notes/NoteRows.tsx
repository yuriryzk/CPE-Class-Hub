import type { CourseNote } from "@/lib/types";
import s from "../files/FileRows.module.css";

/** Phones: course notes as two-line rows in one box; links open in a new tab. */
export default function NoteRows({ notes }: { notes: CourseNote[] }) {
  return (
    <ul className={`box rows ${s.list}`} aria-label="Notes">
      {notes.map((n) =>
        n.kind === "link" ? (
          <li key={n.id}>
            <a className={s.f} href={n.url ?? ""} target="_blank" rel="noopener"><b>{n.title}</b><span className={s.go}>Open ↗</span><small>Link</small></a>
          </li>
        ) : (
          <li key={n.id}>
            <span className={s.f}><b>{n.title}</b><small>{n.body}</small></span>
          </li>
        ),
      )}
    </ul>
  );
}
