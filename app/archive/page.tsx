import Link from "next/link";
import { loadArchivedSemesters, LoadError } from "@/lib/data";
import { formatLong, formatShort } from "@/lib/time";
import s from "./archive.module.css";

export const revalidate = 60;

/** Past semesters, read-only: "Start a new semester" moves the old one here instead of wiping it. */
export default async function Archive() {
  let semesters;
  try {
    semesters = await loadArchivedSemesters();
  } catch (e) {
    if (!(e instanceof LoadError)) throw e;
    return <main><div className="title"><h1>Archive</h1></div><p className="box empty">Couldn&apos;t load the {e.what}. <Link href="/archive">Try again.</Link></p></main>;
  }
  return (
    <main>
      <div className="title">
        <h1>Archive</h1>
        <p className="sub">Past semesters, kept read-only. Starting a new semester moves the old one here.</p>
      </div>
      {semesters.length ? (
        <ul className={`box rows ${s.list}`} aria-label="Archived semesters">
          {semesters.map((t) => (
            <li key={t.id}>
              <Link href={`/archive/${t.id}`} className={s.sem}>
                <b>Semester of {formatLong(t.starts_on)}</b>
                <span>
                  {t.week_count} {t.week_count === 1 ? "week" : "weeks"}
                  {t.breaks.length ? ` · ${t.breaks.length} ${t.breaks.length === 1 ? "break" : "breaks"}` : ""}
                  {` · archived ${formatShort(t.archived_at.slice(0, 10))}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="box empty">No archived semesters yet.</p>
      )}
    </main>
  );
}
