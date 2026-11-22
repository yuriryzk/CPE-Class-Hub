import Link from "next/link";
import { notFound } from "next/navigation";
import { loadArchivedSemester, LoadError } from "@/lib/data";
import { formatLong, formatShort, formatTime, fromPgTime, WEEKDAYS } from "@/lib/time";
import { KIND, type Slot, type SlotChange } from "@/lib/types";
import s from "../archive.module.css";

export const revalidate = 60;

/** "7:30–9:00 AM", or "11:00 AM–1:00 PM" across noon (same rule as the live timetable cards). */
const span = (slot: Pick<Slot, "starts_at" | "ends_at">) => {
  const a = formatTime(fromPgTime(slot.starts_at)), b = formatTime(fromPgTime(slot.ends_at));
  return `${a.slice(-2) === b.slice(-2) ? a.slice(0, -3) : a}–${b}`;
};
const hm = (t: string) => formatTime(fromPgTime(t)).replace(/ [AP]M$/, "");
const where = (slot: Pick<Slot, "online" | "room">) => (slot.online ? "Online" : slot.room);

/** What a one-day class change did, in a few words: "G2 group, 1–3 PM, online, Lab 3, Orientation". */
function changeText(c: SlotChange): string {
  const parts: string[] = [];
  if (c.lab_group) parts.push(`${c.lab_group} group`);
  if (c.starts_at && c.ends_at) parts.push(`${hm(c.starts_at)}–${hm(c.ends_at)}`);
  if (c.online === true) parts.push("online");
  if (c.online === false) parts.push("in person");
  if (c.room) parts.push(c.room);
  if (c.agenda) parts.push(c.agenda);
  return parts.join(", ") || "changed";
}

function Part({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={s.part}>
      <h3>{title}</h3>
      <ul className={s.list}>{children}</ul>
    </div>
  );
}

/** One archived semester, read-only: each course's weekly classes, one-off items, one-day changes, notices and files. */
export default async function ArchivedSemester({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data;
  try {
    data = await loadArchivedSemester(id);
  } catch (e) {
    if (!(e instanceof LoadError)) throw e;
    return <main><div className="title"><h1>Archive</h1></div><p className="box empty">Couldn&apos;t load the {e.what}. <Link href="/archive">Try again.</Link></p></main>;
  }
  if (!data) notFound();
  const { term, courses, slots, items, slotChanges, notices, files } = data;

  return (
    <main>
      <p style={{ marginBottom: 10, fontWeight: 700 }}><Link href="/archive">← All archived semesters</Link></p>
      <div className="title">
        <h1>Semester of {formatLong(term.starts_on)}</h1>
        <p className="sub">
          {term.week_count} {term.week_count === 1 ? "week" : "weeks"} · archived {formatShort(term.archived_at.slice(0, 10))}. Read-only.
        </p>
      </div>
      {term.breaks.length > 0 && (
        <p className="sub" style={{ marginTop: -12, marginBottom: 24 }}>
          Breaks: {term.breaks.map((b) => `${b.label} (week of ${formatShort(b.starts_on)})`).join(", ")}
        </p>
      )}
      {courses.map((c) => {
        const cs = slots.filter((x) => x.course_id === c.id);
        const ci = items.filter((x) => x.course_id === c.id);
        const cc = slotChanges.filter((x) => cs.some((sl) => sl.id === x.slot_id));
        const cn = notices.filter((x) => x.course_id === c.id);
        const cf = files.filter((x) => x.course_id === c.id);
        return (
          <section key={c.id} className={`box ${s.course}`} style={{ "--c": c.color } as React.CSSProperties} aria-label={c.name}>
            <div className={s.band}>
              <span className="tag">{c.code}</span>
              <h2>{c.name}</h2>
              <p>{[c.course_no, c.instructor].filter(Boolean).join(" · ") || " "}</p>
            </div>
            {cs.length > 0 && (
              <Part title="Weekly classes">
                {cs.map((sl) => (
                  <li key={sl.id}>
                    <span className={s.when}>{WEEKDAYS[sl.weekday - 1]}</span>
                    <span>{span(sl)}{where(sl) ? ` · ${where(sl)}` : ""}{sl.lab_group ? ` · ${sl.lab_group}` : ""}</span>
                  </li>
                ))}
              </Part>
            )}
            {cc.length > 0 && (
              <Part title="One-day class changes">
                {cc.map((x) => {
                  const sl = cs.find((sl) => sl.id === x.slot_id)!;
                  return (
                    <li key={`${x.slot_id}-${x.on_date}`}>
                      <span className={s.when}>{formatShort(x.on_date)}</span>
                      <span>{WEEKDAYS[sl.weekday - 1]} {c.code}: {changeText(x)}</span>
                    </li>
                  );
                })}
              </Part>
            )}
            {ci.length > 0 && (
              <Part title="Calendar">
                {ci.map((i) => (
                  <li key={i.id}>
                    <span className={s.when}>{formatShort(i.on_date)}</span>
                    <span className={s.mark}>{KIND[i.kind]}</span>
                    <span>{i.title}{i.at_time ? ` · ${hm(i.at_time)}` : ""}{i.lab_group ? ` · ${i.lab_group}` : ""}</span>
                    {i.moved_from_date && <span className={s.muted}>moved from {formatShort(i.moved_from_date)}</span>}
                    {i.notes && <span className={s.note}>{i.notes}</span>}
                  </li>
                ))}
              </Part>
            )}
            {cn.length > 0 && (
              <Part title="Notices">
                {cn.map((n) => (
                  <li key={n.id}>
                    <span className={s.when}>{formatShort(n.posted_on)}</span>
                    {n.pinned && <span className={s.mark}>Pinned</span>}
                    {n.done && <span className={s.mark}>Done</span>}
                    <span>{n.title}{n.lab_group ? ` · ${n.lab_group}` : ""}</span>
                    <span className={s.note}>{n.body}</span>
                  </li>
                ))}
              </Part>
            )}
            {cf.length > 0 && (
              <Part title="Files">
                {cf.map((f) => (
                  <li key={f.id}>
                    <span className={s.when}>{f.week_label ?? "—"}</span>
                    {f.url
                      ? <a href={f.url} target="_blank" rel="noopener">{f.title} ↗</a>
                      : <span>{f.title} <span className={s.muted}>(no file attached)</span></span>}
                    <span className={s.muted}>{f.file_type}</span>
                  </li>
                ))}
              </Part>
            )}
          </section>
        );
      })}
      <p className="sub" style={{ marginTop: 24 }}>
        Courses, classes, calendar items, notices and files here are from this semester only. The live semester is on <Link href="/courses">Courses</Link>.
      </p>
    </main>
  );
}
