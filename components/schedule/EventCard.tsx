"use client";
import { formatTime, fromPgTime } from "@/lib/time";
import { KIND, type Course, type Item, type Slot } from "@/lib/types";
import type { Entry } from "@/lib/week";
import { openDetail } from "./DetailsDialog";
import s from "./EventCard.module.css";

export { KIND };
const KIND_CLASS: Record<Item["kind"], string> = { quiz_exam: s.test, due: s.due, no_class: s.off, extra_class: "" };

export const pgTime = (t: string) => formatTime(fromPgTime(t));

/** "7:30–9:00 AM", or "11:00 AM–1:00 PM" across noon. */
export function timeSpan(slot: Pick<Slot, "starts_at" | "ends_at">) {
  const a = pgTime(slot.starts_at), b = pgTime(slot.ends_at);
  return `${a.slice(-2) === b.slice(-2) ? a.slice(0, -3) : a}–${b}`;
}

/** "10:30" without AM/PM, for the timetable grid, whose side already shows the hours. */
const hm = (t: string) => {
  const m = fromPgTime(t);
  return `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, "0")}`;
};

export const Tag =({ c }: { c?: Course }) => (
  <span className="tag" style={{ "--c": c?.color ?? "#ddd" } as React.CSSProperties} title={c?.name}>{c?.code ?? "—"}</span>
);

/**
 * `cancelledBy`: the "No class" item cancelling this class today; the class shows hatched and opens that item.
 * `compact`: the timetable grid's layout, tag and time on the first line, then the name, then group and room.
 */
type Props = {
  e: Entry; date: string; course?: Course; next?: boolean; noticed?: boolean; cancelledBy?: Item;
  className?: string; place?: React.CSSProperties; compact?: boolean;
};

export default function EventCard({ e, date, course, next, noticed, cancelledBy, className, place, compact }: Props) {
  const cls: (string | false | undefined)[] = [s.ev, className];
  let body: React.ReactNode, open: () => void;
  if (e.t === "slot") {
    if (cancelledBy) cls.push(s.off);
    open = cancelledBy ? () => openDetail({ t: "item", id: cancelledBy.id }) : () => openDetail({ t: "slot", id: e.slot.id, date });
    body = compact ? (
      <>
        <span className={s.top}><Tag c={course} /><small>{hm(e.slot.starts_at)}–{hm(e.slot.ends_at)}</small></span>
        <b>{course?.name ?? "Course"}</b>
        {(cancelledBy || e.slot.lab_group || e.slot.room) && (
          <small>{[cancelledBy && "No class", e.slot.lab_group, e.slot.room].filter(Boolean).join(" · ")}</small>
        )}
      </>
    ) : (
      <>
        <b>{course?.name ?? "Course"}</b>
        <small><i>{cancelledBy ? "No class" : "Class"}{e.slot.lab_group && ` · ${e.slot.lab_group}`}</i>{timeSpan(e.slot)}</small>
        {e.slot.room && <small>{e.slot.room}</small>}
      </>
    );
  } else if (compact) {
    cls.push(KIND_CLASS[e.item.kind], next && s.nx);
    open = () => openDetail({ t: "item", id: e.item.id });
    body = (
      <>
        <span className={s.top}><Tag c={course} />{e.item.at_time && <small>{hm(e.item.at_time)}</small>}</span>
        <b>{e.item.title}</b>
        <small>
          <i>{KIND[e.item.kind]}{e.item.lab_group && ` · ${e.item.lab_group}`}</i>
          {e.item.moved_from_date && <span className={s.mv}>Moved</span>}
          {noticed && <span className={s.nb}>Notice</span>}
        </small>
      </>
    );
  } else {
    cls.push(KIND_CLASS[e.item.kind], next && s.nx);
    open = () => openDetail({ t: "item", id: e.item.id });
    // A "No class" titled "No class" says why instead, when there is a reason.
    const title = e.item.title === KIND[e.item.kind] && e.item.notes ? e.item.notes : e.item.title;
    body = (
      <>
        <b>{title}</b>
        <small>
          <i>{KIND[e.item.kind]}{e.item.lab_group && ` · ${e.item.lab_group}`}</i>
          {e.item.at_time && pgTime(e.item.at_time)}
          {e.item.moved_from_date && <span className={s.mv}>Moved</span>}
          {noticed && <span className={s.nb}>Notice</span>}
        </small>
      </>
    );
  }
  return (
    <button type="button" className={cls.filter(Boolean).join(" ")} style={{ "--c": course?.color ?? "#ddd", ...place } as React.CSSProperties} onClick={open}>
      {!compact && <Tag c={course} />}
      {body}
    </button>
  );
}
