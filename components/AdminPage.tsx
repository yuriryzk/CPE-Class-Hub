import Link from "next/link";
import { getOfficer } from "@/lib/auth";
import s from "./Admin.module.css";

const TABS = [
  ["notices", "Notice"],
  ["calendar", "Calendar"],
  ["classes", "Class"],
  ["files", "File"],
  ["courses", "Courses"],
  ["officers", "Officers"], // head officer only
] as const;

/** Admin layout: tabs and the form on the left, the list on the right. */
export default async function AdminPage({ tab, form, list, count, children }: {
  tab: (typeof TABS)[number][0]; form: React.ReactNode; list: string; count: number; children: React.ReactNode;
}) {
  const head = (await getOfficer())?.role === "head";
  return (
    <main>
      <div className="title"><h1>Admin</h1></div>
      <div className={s.adm}>
        <div>
          <nav className={`seg ${s.tabs}`} aria-label="What to change">
            {TABS.filter(([k]) => k !== "officers" || head).map(([k, label]) => (
              <Link key={k} href={`/admin/${k}`} aria-current={k === tab ? "page" : undefined}>{label}</Link>
            ))}
          </nav>
          {form}
        </div>
        <section className={`box ${s.rows}`} aria-label={list}>
          <div className={s.rh}>{list}<span>{count} {count === 1 ? "item" : "items"}</span></div>
          {count ? children : <p className="empty">Nothing here yet.</p>}
        </section>
      </div>
    </main>
  );
}
