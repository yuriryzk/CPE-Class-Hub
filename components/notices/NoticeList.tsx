"use client";
import { useState } from "react";
import { formatShort } from "@/lib/time";
import { otherGroup } from "@/lib/week";
import { useGroup } from "../schedule/GroupSwitch";
import notes from "../schedule/PostedThisWeek.module.css";
import NoticeCard, { type Row } from "./NoticeCard";
import s from "./NoticeList.module.css";
import { useView } from "./ViewSwitch";

export default function NoticeList({ rows: all }: { rows: Row[] }) {
  const view = useView();
  const group = useGroup();
  const [open, setOpen] = useState<string[]>([]);
  const rows = all.filter((r) => !otherGroup(r.group, group));
  if (!rows.length) return <p className="empty">No notices for {group} yet.</p>;
  if (view === "cards") return <div className={`${notes.notes} ${s.pad}`}>{rows.map((r) => <NoticeCard key={r.id} r={r} />)}</div>;
  const toggle = (id: string) => setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  return (
    <table className={s.tbl}>
      <thead><tr><th scope="col">Course</th><th scope="col">Notice</th><th scope="col">Date</th><th scope="col">Calendar</th><th scope="col">Status</th></tr></thead>
      <tbody>
        {rows.flatMap((r) => {
          const shown = open.includes(r.id);
          const style = { "--c": r.color } as React.CSSProperties;
          const past = r.status === "Active" ? "" : s.past;
          // The whole row toggles; the button inside gives keyboard and screen-reader access (its click bubbles up).
          const row = (
            <tr key={r.id} className={`${s.row} ${past}`} style={style} onClick={() => toggle(r.id)}>
              <td>{r.code}{r.group && ` ${r.group}`}</td>
              <td><button type="button" className={s.open} aria-expanded={shown}>{r.title}</button></td>
              <td>{formatShort(r.posted)}</td><td>{r.calendar ?? "—"}</td><td>{r.status}</td>
            </tr>
          );
          return shown
            ? [row, <tr key={`${r.id}-body`} className={`${s.body} ${past}`} style={style}><td colSpan={5}>{r.body}</td></tr>]
            : [row];
        })}
      </tbody>
    </table>
  );
}
