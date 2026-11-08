"use client";
import { useEffect, useRef, useState } from "react";
import { formatLong, formatShort, manilaToday } from "@/lib/time";
import type { Course, FileRow, Item, Notice } from "@/lib/types";
import { isPastNotice, type WeekData } from "@/lib/week";
import { KIND, pgTime, Tag, timeSpan } from "./EventCard";
import s from "./DetailsDialog.module.css";

export type DetailKey = { t: "slot"; id: string; date: string } | { t: "item"; id: string } | { t: "note"; id: string };

const EVENT = "classhub:detail";
/** Open the details panel for a calendar entry. Needs <DetailsDialog /> on the page. */
export const openDetail = (key: DetailKey) => window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));

type Props = { week: WeekData | null; upcoming: Item[]; courses: Course[]; files: FileRow[] | null };

const at = (date: string, time: string | null) => `${formatLong(date)}${time ? `, ${pgTime(time)}` : ""}`;

export default function DetailsDialog({ week, upcoming, courses, files }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [key, setKey] = useState<DetailKey | null>(null);
  useEffect(() => {
    const on = (e: Event) => setKey((e as CustomEvent<DetailKey>).detail);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  useEffect(() => {
    if (key && !ref.current?.open) ref.current?.showModal();
  }, [key]);

  const items = [...(week?.items ?? []), ...upcoming];
  const notices = week?.notices ?? [];
  const today = manilaToday();
  const noteOf = (id: string) => notices.find((n) => n.calendar_item_id === id);

  let course: string | undefined, kind = "", title = "", rows: [string, string][] = [], note: Notice | undefined, body: string | undefined;
  if (key?.t === "slot") {
    const slot = week?.slots.find((x) => x.id === key.id);
    if (slot) {
      const off = week?.items.find((i) => i.kind === "no_class" && i.on_date === key.date && i.course_id === slot.course_id && (!i.class_slot_id || i.class_slot_id === slot.id));
      course = slot.course_id;
      kind = off ? "Class (cancelled)" : "Class";
      title = courses.find((c) => c.id === slot.course_id)?.name ?? "Course";
      rows = [
        ["When", `${formatLong(key.date)}, ${timeSpan(slot)}`],
        ["Where", slot.room || "—"],
        ["Group", slot.lab_group || "Whole class"],
        ["Repeats", `Every ${formatLong(key.date).split(" ")[0]}`],
      ];
      if (off) {
        rows.push(["Why", off.notes || "No class on this day"]);
        note = noteOf(off.id);
      }
    }
  } else if (key?.t === "item") {
    const x = items.find((i) => i.id === key.id);
    if (x) {
      course = x.course_id;
      kind = KIND[x.kind];
      title = x.title;
      rows = [["When", at(x.on_date, x.at_time)]];
      if (x.moved_from_date) rows.push(["Moved from", at(x.moved_from_date, x.moved_from_time)]);
      rows.push(["Course", courses.find((c) => c.id === x.course_id)?.name ?? ""]);
      if (x.notes) rows.push(["Notes", x.notes]);
      note = noteOf(x.id);
    }
  } else if (key?.t === "note") {
    const n = notices.find((n) => n.id === key.id);
    if (n) {
      course = n.course_id;
      kind = "Notice";
      title = n.title;
      body = n.body;
      rows = [["Posted", formatLong(n.posted_on)], ["Course", courses.find((c) => c.id === n.course_id)?.name ?? ""]];
      if (isPastNotice(n, items, today)) rows.push(["Status", n.done ? "Done" : "Passed"]);
    }
  }
  const c = courses.find((x) => x.id === course);
  const own = files?.filter((f) => f.course_id === course) ?? [];
  const notePast = note && isPastNotice(note, items, today);

  return (
    <dialog ref={ref} className={s.dlg} style={{ "--c": c?.color ?? "#ddd" } as React.CSSProperties} aria-labelledby="dlgt" onClose={() => setKey(null)}>
      {course && (
        <>
          <div className={s.dh}>
            <div>
              <Tag c={c} />
              <p style={{ marginTop: 8 }}>{kind}</p>
              <h2 id="dlgt">{title}</h2>
            </div>
            <button type="button" className={s.x} aria-label="Close" onClick={() => ref.current?.close()}>×</button>
          </div>
          <div className={s.db}>
            {body && <p className={s.body}>{body}</p>}
            <dl>
              {rows.map(([k, v]) => <div key={k} className={s.row}><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl>
            {note && (
              <div className={`${s.lnote}${notePast ? ` ${s.past}` : ""}`}>
                <h3>Notice: {note.title}</h3>
                <p>{note.body}</p>
                <p className={s.meta}>Posted {formatShort(note.posted_on)}{notePast ? ` · ${note.done ? "Done" : "Passed"}` : ""}</p>
              </div>
            )}
            <div>
              <h3>Files for {c?.code}</h3>
              {files === null ? (
                <p className={s.meta}>Couldn&apos;t load the files. <a href="">Try again.</a></p>
              ) : own.length ? (
                <ul>
                  {own.map((f) => (
                    <li key={f.id}>
                      {f.url ? <a href={f.url} target="_blank" rel="noopener noreferrer">{f.title} ↗</a> : <b>{f.title}</b>} <span>· {f.file_type}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className={s.meta}>No files for this course yet.</p>}
            </div>
          </div>
        </>
      )}
    </dialog>
  );
}
