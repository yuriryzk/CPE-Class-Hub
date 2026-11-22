import Link from "next/link";
import { getOfficer } from "@/lib/auth";
import type { AdminSort } from "@/lib/sort";
import s from "./Admin.module.css";
import SortSwitch from "./SortSwitch";

const TABS = [
  ["notices", "Notice"],
  ["calendar", "Calendar"],
  ["ingest", "Syllabus"],
  ["classes", "Class"],
  ["files", "File"],
  ["courses", "Courses"],
  ["reports", "Reports"],
  ["officers", "Officers"], // head officer only
] as const;

export type AdminTab = (typeof TABS)[number][0];

/** The admin tab bar; also used by pages that don't fit the form+list AdminPage layout. */
export async function AdminTabs({ tab }: { tab: AdminTab }) {
  const head = (await getOfficer())?.role === "head";
  return (
    <nav className={`seg ${s.tabs}`} aria-label="What to change">
      {TABS.filter(([k]) => k !== "officers" || head).map(([k, label]) => (
        <Link key={k} href={`/admin/${k}`} aria-current={k === tab ? "page" : undefined}>{label}</Link>
      ))}
    </nav>
  );
}

/** Admin layout: tabs and the form on the left, the list on the right. */
export default async function AdminPage({ tab, form, list, count, sort, children }: {
  tab: AdminTab; form: React.ReactNode; list: string; count: number; sort?: AdminSort; children: React.ReactNode;
}) {
  return (
    <main>
      <div className="title"><h1>Admin</h1></div>
      <div className={s.adm}>
        <div>
          <AdminTabs tab={tab} />
          {form}
        </div>
        <section className={`box ${s.rows}`} aria-label={list}>
          <div className={s.rh}>{list}<span>{count} {count === 1 ? "item" : "items"}</span>{sort && <SortSwitch list={tab} value={sort} />}</div>
          {count ? children : <p className="empty">Nothing here yet.</p>}
        </section>
      </div>
    </main>
  );
}
