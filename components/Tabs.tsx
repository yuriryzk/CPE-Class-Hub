"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { savePicks } from "@/components/schedule/PicksSync";
import { codesParam, toggle } from "@/lib/picks";
import { GENERAL, type Course } from "@/lib/types";
import s from "./Tabs.module.css";

const sw = (c: string) => ({ "--c": c }) as React.CSSProperties;

type Props = { label: string; base: string; courses: Course[]; counts: Record<string, number> } & (
  | { multi: true; sel: string[] } // sel: course ids, [] = All
  | { multi?: false; sel: string } // sel: a course code or "general"
);

/** Folder tabs. Multi: tap several courses, remembered. Single: one tab, a plain link. */
export default function Tabs(p: Props) {
  const router = useRouter();
  if (p.multi) {
    const pick = (id: string | "all") => {
      const ids = toggle(p.sel, id, p.courses.length);
      savePicks(ids);
      const codes = codesParam(ids, p.courses);
      router.push(codes ? `${p.base}?${new URLSearchParams({ course: codes })}` : p.base, { scroll: false });
    };
    return (
      <div className={s.tabs} role="group" aria-label={p.label}>
        <button type="button" className={`${s.all} ${s.ink}`} aria-pressed={!p.sel.length} onClick={() => pick("all")}>
          <span className="sw" aria-hidden="true" />All <small>{p.counts.all}</small>
        </button>
        {p.courses.map((c) => (
          <button key={c.id} type="button" title={c.name} aria-pressed={p.sel.includes(c.id)} style={sw(c.color)} onClick={() => pick(c.id)}>
            <span className="sw" style={sw(c.color)} aria-hidden="true" />{c.code} <small>{p.counts[c.id] ?? 0}</small>
          </button>
        ))}
      </div>
    );
  }
  return (
    <nav className={s.tabs} aria-label={p.label}>
      {p.courses.map((c) => (
        <Link key={c.id} href={`${p.base}?course=${c.code}`} title={c.name} style={sw(c.color)} aria-current={p.sel === c.code ? "page" : undefined}>
          <span className="sw" style={sw(c.color)} aria-hidden="true" />{c.code} <small>{p.counts[c.id] ?? 0}</small>
        </Link>
      ))}
      <Link href={`${p.base}?course=general`} style={sw(GENERAL)} aria-current={p.sel === "general" ? "page" : undefined}>
        <span className="sw" style={sw(GENERAL)} aria-hidden="true" />General <small>{p.counts.general ?? 0}</small>
      </Link>
    </nav>
  );
}

/** The panel under the tabs: a header in the chosen colour, then the body. */
export function TabPanel({ title, count, hint, color, swatches, children }: {
  title: string; count: string; hint?: string; color?: string; swatches?: string[]; children: React.ReactNode;
}) {
  return (
    <section className={`box ${s.panel}`}>
      <div className={`${s.tph}${color ? "" : ` ${s.ink}`}`} style={color ? sw(color) : undefined}>
        <div>
          {swatches && <p className={s.sws}>{swatches.map((c) => <span key={c} className="sw" style={sw(c)} aria-hidden="true" />)}</p>}
          <h2>{title}</h2>
          <p>{count}</p>
          {hint && <p className={s.tphint}>{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
