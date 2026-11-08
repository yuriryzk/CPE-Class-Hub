"use client";
import { formatShort } from "@/lib/time";
import notes from "../schedule/PostedThisWeek.module.css";
import NoticeCard, { type Row } from "./NoticeCard";
import s from "./NoticeList.module.css";
import { useView } from "./ViewSwitch";

export default function NoticeList({ rows }: { rows: Row[] }) {
  const view = useView();
  if (view === "cards") return <div className={`${notes.notes} ${s.pad}`}>{rows.map((r) => <NoticeCard key={r.id} r={r} />)}</div>;
  return (
    <table className={s.tbl}>
      <thead><tr><th scope="col">Course</th><th scope="col">Notice</th><th scope="col">Posted</th><th scope="col">Calendar</th><th scope="col">Status</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className={r.status === "Active" ? undefined : s.past} style={{ "--c": r.color } as React.CSSProperties}>
            <td>{r.code}</td><td>{r.title}</td><td>{formatShort(r.posted)}</td><td>{r.calendar ?? "—"}</td><td>{r.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
