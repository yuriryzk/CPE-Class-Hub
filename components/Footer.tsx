import Image from "next/image";
import Link from "next/link";
import pkg from "@/package.json";
import { getOfficer } from "@/lib/auth";
import { loadLastUpdate, loadTerm } from "@/lib/data";
import { formatShort, formatTime, manilaNowMinutes, manilaToday, sundayOf } from "@/lib/time";
import { termWeek } from "@/lib/week";
import s from "./Footer.module.css";

export default async function Footer() {
  // Like the header, the footer must render when the database is down; the parts it couldn't load are left out.
  const [sem, last, officer] = await Promise.all([
    loadTerm().catch(() => null),
    loadLastUpdate().catch(() => null),
    getOfficer().catch(() => null),
  ]);
  const tw = sem && termWeek(sundayOf(manilaToday()), sem.term, sem.breaks);
  const week = typeof tw === "number" ? `Week ${tw} of ${sem!.term.week_count}` : tw; // a break's label; null outside the term
  const at = last ? new Date(last) : null;
  return (
    <footer className={s.bar}>
      <div className={s.ft}>
        <p className={s.info}>
          <span className={s.who}><Image src="/logo.png" width={22} height={22} alt="" /><b>CPE 3C</b></span>
          {week && <span>{week}</span>}
          {at && <span>Updated {formatShort(manilaToday(at))}, {formatTime(manilaNowMinutes(at))}</span>}
        </p>
        <p className={s.end}>
          {!officer && <Link href="/login">Officer sign in</Link>}
          <span>v{pkg.version}</span>
        </p>
      </div>
    </footer>
  );
}
