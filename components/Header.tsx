import Link from "next/link";
import { loadCourses } from "@/lib/data";
import Nav from "./Nav";
import s from "./Header.module.css";

export default async function Header() {
  // The header must render even when the database is down.
  const courses = await loadCourses().catch(() => []);
  return (
    <header className={s.top}>
      <Link className={s.mark} href="/" aria-label="Class Hub, home">
        <i aria-hidden="true">{courses.map((c) => <b key={c.id} style={{ background: c.color }} />)}</i>
        <span>Class Hub</span>
      </Link>
      <Nav />
      <div className={s.end}>
        {/* Task 9 fills the signed-in state (name, Admin, Sign out) */}
        <Link className="btn s" href="/sign-in">Officer sign in</Link>
      </div>
    </header>
  );
}
