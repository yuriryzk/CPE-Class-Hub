"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cancelSlotOn, restoreSlotOn } from "@/app/admin/actions/slots";
import { toast } from "@/components/Toast";
import type { ActionResult } from "@/lib/auth";
import { formatLong, formatShort, manilaToday } from "@/lib/time";
import type { Course, FileRow, Item, Notice } from "@/lib/types";
import { isPastNotice, type WeekData } from "@/lib/week";
import { KIND, pgTime, Tag, timeSpan } from "./EventCard";
import s from "./DetailsDialog.module.css";

export type DetailKey = { t: "slot"; id: string; date: string } | { t: "item"; id: string } | { t: "note"; id: string };

const EVENT = "classhub:detail";
/** Open the details panel for a calendar entry. Needs <DetailsDialog /> on the page. */
export const openDetail = (key: DetailKey) => window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));

type Props = { week: WeekData | null; upcoming: Item[]; upNotices: Notice[]; courses: Course[]; files: FileRow[] | null; isOfficer: boolean };

const at = (date: string, time: string | null) => `${formatLong(date)}${time ? `, ${pgTime(time)}` : ""}`;

export default function DetailsDialog({ week, upcoming, upNotices, courses, files, isOfficer }: Props) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [key, setKey] = useState<DetailKey | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const on = (e: Event) => setKey((e as CustomEvent<DetailKey>).detail);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  useEffect(() => {
    if (key && !ref.current?.open) ref.current?.showModal();
  }, [key]);

  const items = [...(week?.items ?? []), ...(week?.linkedItems ?? []), ...upcoming];
  const weekNotices = week?.notices ?? [];
  const notices = [...weekNotices, ...upNotices.filter((u) => !weekNotices.some((n) => n.id === u.id))];
  const today = manilaToday();
  const noteOf = (id: string) => notices.find((n) => n.calendar_item_id === id);

  let foot: React.ReactNode;
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
      const run = async (act: () => Promise<ActionResult>, done: string) => {
        setBusy(true);
        try {
          const r = await act();
          toast(r.ok ? done : r.message);
          if (r.ok) router.refresh();
        } catch {
          toast("Couldn't save. Try again.");
        } finally {
          setBusy(false);
        }
      };
      foot = !off
        ? <button type="button" className="btn s" disabled={busy} onClick={() => run(() => cancelSlotOn(slot.id, key.date), `Class cancelled for ${formatShort(key.date)}`)}>Cancel this class on {formatShort(key.date)} only</button>
        : off.class_slot_id
          ? <button type="button" className="btn s" disabled={busy} onClick={() => run(() => restoreSlotOn(off.id), "Class restored")}>Restore this class</button>
          : <span>Cancelled for the whole course. Change it under Admin → Calendar.</span>;
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
            {isOfficer && foot && <div className={s.foot}><p>Officers only</p>{foot}</div>}
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
