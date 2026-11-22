import { loadDuty, LoadError } from "@/lib/data";
import { formatShort } from "@/lib/time";
import type { DutyAssignment } from "@/lib/types";
import s from "./duty.module.css";

export const revalidate = 60;

const scope = (d: DutyAssignment) => d.week_label ?? (d.on_date ? formatShort(d.on_date) : "Ongoing");

export default async function Duty() {
  let duties;
  try {
    duties = await loadDuty();
  } catch (e) {
    if (!(e instanceof LoadError)) throw e;
    return <main><div className="title"><h1>Duty roster</h1></div><p className="box empty">Couldn&apos;t load the {e.what}. <a href="/duty">Try again.</a></p></main>;
  }

  return (
    <main>
      <div className="title"><h1>Duty roster</h1><p className="sub">Who holds each officer duty.</p></div>
      {duties.length ? (
        <ul className={`box rows ${s.list}`} aria-label="Duties">
          {duties.map((d) => (
            <li key={d.id} className={s.row}>
              <b>{d.duty}</b>
              <small>{d.assignee_email} · {scope(d)}{d.notes ? ` · ${d.notes}` : ""}</small>
            </li>
          ))}
        </ul>
      ) : (
        <p className="box empty">No duties posted yet.</p>
      )}
    </main>
  );
}
