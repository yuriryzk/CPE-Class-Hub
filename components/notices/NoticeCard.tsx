import { formatShort } from "@/lib/time";
import { KIND, type Course, type Item, type Notice } from "@/lib/types";
import { isPastNotice } from "@/lib/week";
import s from "../schedule/PostedThisWeek.module.css";

export type Row = {
  id: string; code: string; name: string; color: string; title: string; body: string; group: Notice["lab_group"];
  posted: string; pinned: boolean; status: "Active" | "Done" | "Passed"; calendar: string | null;
};

/** Notices as card/list rows. `items` must include the items the notices link to, so passed ones show as Passed. */
export function noticeRows(notices: Notice[], courses: Course[], items: Item[], today: string): Row[] {
  return notices.map((n) => {
    const c = courses.find((c) => c.id === n.course_id);
    const x = items.find((i) => i.id === n.calendar_item_id);
    return {
      id: n.id, code: c?.code ?? "", name: c?.name ?? "", color: c?.color ?? "#ddd", title: n.title, body: n.body, group: n.lab_group,
      posted: n.posted_on, pinned: n.pinned, status: n.done ? "Done" : isPastNotice(n, items, today) ? "Passed" : "Active",
      calendar: x ? `${KIND[x.kind]}, ${formatShort(x.on_date)}` : null,
    };
  });
}

export default function NoticeCard({ r }: { r: Row }) {
  const past = r.status !== "Active";
  return (
    <article className={`box ${s.note}${past ? ` ${s.past}` : ""}`} style={{ "--c": r.color } as React.CSSProperties}>
      <div className={s.hd}>{r.code}{r.group && ` ${r.group}`} · {r.name}<small>{formatShort(r.posted)}</small></div>
      <div className={s.bd}>
        {past ? <span className={s.pin} style={{ background: "#555" }}>{r.status}</span> : r.pinned && <span className={s.pin}>Pinned</span>}
        <h3>{r.title}</h3>
        <p>{r.body}</p>
        {r.calendar && <p><b>On the calendar: {r.calendar}</b></p>}
      </div>
    </article>
  );
}
