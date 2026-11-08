"use client";
import Link from "next/link";
import { formatShort } from "@/lib/time";
import type { Course, Item, Notice } from "@/lib/types";
import { isPastNotice, sortNotices } from "@/lib/week";
import { openDetail } from "./DetailsDialog";
import { KIND, pgTime } from "./EventCard";
import s from "./PostedThisWeek.module.css";

/** Notices posted in the shown week: active before past, then pinned, then newest. */
export default function PostedThisWeek({ notices, items, courses, today }: { notices: Notice[]; items: Item[]; courses: Course[]; today: string }) {
  const list = sortNotices(notices, items, today);
  return (
    <section className={s.posted} aria-labelledby="posted">
      <div className={s.sec}>
        <h2 id="posted">Posted this week</h2>
        <Link href="/notices">See all notices</Link>
      </div>
      <div className={s.notes}>
        {list.length ? list.map((n) => {
          const c = courses.find((c) => c.id === n.course_id);
          const x = n.calendar_item_id ? items.find((i) => i.id === n.calendar_item_id) : undefined;
          const past = isPastNotice(n, items, today);
          return (
            <article key={n.id} className={`box ${s.note}${past ? ` ${s.past}` : ""}`} style={{ "--c": c?.color ?? "#ddd" } as React.CSSProperties}>
              <div className={s.hd}>{c?.code} · {c?.name}<small>{formatShort(n.posted_on)}</small></div>
              <div className={s.bd}>
                {past ? <span className={s.pin} style={{ background: "#555" }}>{n.done ? "Done" : "Passed"}</span> : n.pinned && <span className={s.pin}>Pinned</span>}
                <h3>{n.title}</h3>
                <p>{n.body}</p>
                {x && (
                  <button type="button" className={s.lk} onClick={() => openDetail({ t: "item", id: x.id })}>
                    On the calendar: {KIND[x.kind]}, {formatShort(x.on_date)}{x.at_time && ` at ${pgTime(x.at_time)}`}
                  </button>
                )}
              </div>
            </article>
          );
        }) : <p className="box empty">Nothing posted this week.</p>}
      </div>
    </section>
  );
}
