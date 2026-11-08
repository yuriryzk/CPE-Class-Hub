import Link from "next/link";
import s from "./Admin.module.css";

// Later admin pages add their tab here.
const TABS = [
  ["notices", "Notice"],
  ["calendar", "Calendar"],
  ["classes", "Class"],
] as const;

/** Admin layout: tabs and the form on the left, the list on the right. */
export default function AdminPage({ tab, form, list, count, children }: {
  tab: (typeof TABS)[number][0]; form: React.ReactNode; list: string; count: number; children: React.ReactNode;
}) {
  return (
    <main>
      <div className="title"><h1>Admin</h1></div>
      <div className={s.adm}>
        <div>
          <nav className={`seg ${s.tabs}`} aria-label="What to change">
            {TABS.map(([k, label]) => (
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
