import Image from "next/image";
import Link from "next/link";
import { getOfficer } from "@/lib/auth";
import Nav from "./Nav";
import s from "./Header.module.css";

export default async function Header() {
  // The header must render even when the database is down.
  const officer = await getOfficer().catch(() => null);
  return (
    <header className={s.top}>
      <Link className={s.mark} href="/" aria-label="Class Hub, home">
        <Image src="/logo.png" width={36} height={36} alt="" priority />
        <span>Class Hub</span>
      </Link>
      <Nav />
      <div className={s.end}>
        {officer && (
          <>
            <span className={s.who}>{officer.name}</span>
            <Link className="btn s" href="/admin">Admin</Link>
            <form action="/auth/signout" method="post">
              <button className="btn s">Sign out</button>
            </form>
          </>
        )}
      </div>
    </header>
  );
}
