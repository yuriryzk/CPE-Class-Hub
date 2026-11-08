"use client";
import { addBreak, removeBreak, saveTerm } from "@/app/admin/actions/term";
import { breakSchema, termSchema } from "@/lib/schemas";
import { formatShort } from "@/lib/time";
import type { Term, TermBreak } from "@/lib/types";
import s from "../Admin.module.css";
import { ActionButton } from "../ConfirmDelete";
import { useAdminForm } from "./useAdminForm";

/** The Semester section: Week 1 start, number of weeks, and the break weeks. Only Sundays are accepted. */
export default function TermForm({ term, breaks }: { term: Term; breaks: TermBreak[] }) {
  const t = useAdminForm({ schema: termSchema, action: saveTerm, done: () => "Semester saved", base: "/admin/courses", editing: true });
  const b = useAdminForm({ schema: breakSchema, action: addBreak, done: () => "Break added", base: "/admin/courses", editing: false });
  return (
    <>
      <form className={`box ${s.panel}`} aria-label="Semester" onSubmit={t.onSubmit} noValidate>
        <h2>Semester</h2>
        <p className={s.hint}>Week 1 starts on a Sunday. Break weeks don&apos;t count as teaching weeks.</p>
        <div className={s.f2}>
          <label>Week 1 starts<input type="date" name="starts_on" defaultValue={term.starts_on} required /></label>
          <label>Number of weeks<input type="number" name="week_count" defaultValue={term.week_count} min={1} max={52} required /></label>
        </div>
        {t.err("starts_on")}
        {t.err("week_count")}
        <button className={`btn p ${s.save}`} disabled={t.busy}>Save semester</button>
      </form>
      <form className={`box ${s.panel}`} aria-label="Breaks" onSubmit={b.onSubmit} noValidate>
        <h2>Breaks</h2>
        <p className={s.hint}>No regular classes in a break week.</p>
        <ul className={s.breaks}>
          {breaks.map((x) => (
            <li key={x.starts_on}>
              <span><b>{x.label}</b> · week of {formatShort(x.starts_on)}</span>
              <ActionButton label="Remove" action={removeBreak.bind(null, x.starts_on)} done="Break removed" ask={`Remove ${x.label}?`} />
            </li>
          ))}
        </ul>
        <div className={s.f2}>
          <label>Week starts (Sunday)<input type="date" name="starts_on" required /></label>
          <label>Label<input name="label" placeholder="Midterm break" maxLength={60} required /></label>
        </div>
        {b.err("starts_on")}
        {b.err("label")}
        <button className={`btn p ${s.save}`} disabled={b.busy}>Add break</button>
      </form>
    </>
  );
}
