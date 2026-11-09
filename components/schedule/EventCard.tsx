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

export const Tag = ({ c }: { c?: Course }) => (
  <span className="tag" style={{ "--c": c?.color ?? "#ddd" } as React.CSSProperties} title={c?.name}>{c?.code ?? "—"}</span>
);

type Props = { e: Entry; date: string; course?: Course; inGroup?: boolean; next?: boolean; noticed?: boolean };

export default function EventCard({ e, date, course, inGroup, next, noticed }: Props) {
  const cls = [s.ev, inGroup && s.in];
  let body: React.ReactNode, open: () => void;
  if (e.t === "slot") {
    open = () => openDetail({ t: "slot", id: e.slot.id, date });
    body = (
      <>
        <b>{course?.name ?? "Course"}</b>
        <small><i>Class{e.slot.lab_group && ` · ${e.slot.lab_group}`}</i>{timeSpan(e.slot)}</small>
        {e.slot.room && <small>{e.slot.room}</small>}
      </>
    );
  } else {
    cls.push(KIND_CLASS[e.item.kind], next && s.nx);
    open = () => openDetail({ t: "item", id: e.item.id });
    body = (
      <>
        <b>{e.item.title}</b>
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
    <button type="button" className={cls.filter(Boolean).join(" ")} style={{ "--c": course?.color ?? "#ddd" } as React.CSSProperties} onClick={open}>
      <Tag c={course} />
      {body}
    </button>
  );
}
