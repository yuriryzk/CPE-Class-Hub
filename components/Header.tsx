import Link from "next/link";
import { getOfficer } from "@/lib/auth";
import { loadCourses } from "@/lib/data";
import Nav from "./Nav";
import s from "./Header.module.css";

export default async function Header() {
  // The header must render even when the database is down.
  const courses = await loadCourses().catch(() => []);
  const officer = await getOfficer().catch(() => null);
  return (
    <header className={s.top}>
      <Link className={s.mark} href="/" aria-label="Class Hub, home">
        <i aria-hidden="true">{courses.map((c) => <b key={c.id} style={{ background: c.color }} />)}</i>
        <span>Class Hub</span>
      </Link>
      <Nav />
      <div className={s.end}>
        {officer ? (
          <>
            <span>{officer.name}</span>{" "}
            <Link className="btn s" href="/admin">Admin</Link>{" "}
            <form action="/auth/signout" method="post" style={{ display: "inline" }}>
              <button className="btn s">Sign out</button>
            </form>
          </>
        ) : (
          <Link className="btn s" href="/login">Officer sign in</Link>
        )}
      </div>
    </header>
  );
}
