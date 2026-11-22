import Link from "next/link";
import SearchBox from "@/components/SearchBox";
import { Tag } from "@/components/schedule/EventCard";
import { loadCourses, loadFiles, loadNotices, LoadError } from "@/lib/data";
import { searchAll } from "@/lib/search";
import { formatShort } from "@/lib/time";
import { GENERAL } from "@/lib/types";
import s from "./search.module.css";

export const revalidate = 60;

/** Global search: courses by name or code, notices by title or body, files by title. Server-rendered so results never go stale. */
export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  let data;
  try {
    // Done notices only live on their course page, so search shows the same set the Notices page does.
    const [courses, notices, files] = await Promise.all([loadCourses(), loadNotices().then((ns) => ns.filter((n) => !n.done)), loadFiles()]);
    data = { courses, notices, files };
  } catch (e) {
    if (!(e instanceof LoadError)) throw e;
    return <main><div className="title"><h1>Search</h1></div><p className="box empty">Couldn&apos;t load the {e.what}. <a href="/search">Try again.</a></p></main>;
  }
  const { courses, notices, files } = data;
  const r = searchAll(query, courses, notices, files);
  const total = r.courses.length + r.notices.length + r.files.length;

  return (
    <main>
      <div className="title"><h1>Search</h1></div>
      <form action="/search" method="get" role="search" className={s.form}>
        <SearchBox defaultValue={query || undefined} />
        <button className="btn p" type="submit">Search</button>
      </form>
      {!query ? (
        <p className="box empty">Type a course, notice or file to search.</p>
      ) : !total ? (
        <p className="box empty">Nothing matches &ldquo;{query}&rdquo;.</p>
      ) : (
        <>
          {r.courses.length > 0 && (
            <section className={s.group} aria-labelledby="res-courses">
              <h2 id="res-courses" className={s.h}>Courses <span>{r.courses.length}</span></h2>
              <ul className={`box rows ${s.list}`}>
                {r.courses.map((c) => (
                  <li key={c.id}>
                    <Link href={`/courses/${c.code}`} className={s.row}>
                      <Tag c={c} /><b>{c.name}</b><small>{[c.code, c.course_no].filter(Boolean).join(" · ")}</small>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {r.notices.length > 0 && (
            <section className={s.group} aria-labelledby="res-notices">
              <h2 id="res-notices" className={s.h}>Notices <span>{r.notices.length}</span></h2>
              <ul className={`box rows ${s.list}`}>
                {r.notices.map(({ notice: n, course }) => (
                  <li key={n.id}>
                    <Link href={`/notices?course=${course.code}`} className={s.row}>
                      <Tag c={course} /><b>{n.title}</b>
                      <small>{course.code} · {formatShort(n.posted_on)}</small>
                      <span className={s.snip}>{n.body}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {r.files.length > 0 && (
            <section className={s.group} aria-labelledby="res-files">
              <h2 id="res-files" className={s.h}>Files <span>{r.files.length}</span></h2>
              <ul className={`box rows ${s.list}`}>
                {r.files.map(({ file: f, course }) => (
                  <li key={f.id}>
                    <Link href={`/files?course=${course?.code ?? "general"}`} className={s.row}>
                      <span className="tag" style={{ "--c": course?.color ?? GENERAL } as React.CSSProperties}>{course?.code ?? "General"}</span>
                      <b>{f.title}</b>
                      <small>{[f.file_type, f.week_label].filter(Boolean).join(" · ")}</small>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}
