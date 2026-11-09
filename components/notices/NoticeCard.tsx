import { formatShort } from "@/lib/time";
import type { Notice } from "@/lib/types";
import s from "../schedule/PostedThisWeek.module.css";

export type Row = {
  id: string; code: string; name: string; color: string; title: string; body: string; group: Notice["lab_group"];
  posted: string; pinned: boolean; status: "Active" | "Done" | "Passed"; calendar: string | null;
};

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
