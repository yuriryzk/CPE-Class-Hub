"use client";
import Link from "next/link";
import { useState } from "react";
import { saveNotice } from "@/app/admin/actions/notices";
import { KIND, pgTime } from "@/components/schedule/EventCard";
import { noticeSchema } from "@/lib/schemas";
import { formatShort } from "@/lib/time";
import type { Course, Item, Notice } from "@/lib/types";
import s from "../Admin.module.css";
import CourseSelect from "./CourseSelect";
import GroupSelect from "./GroupSelect";
import { useAdminForm } from "./useAdminForm";

/** Post or edit a notice; it can link to a calendar item or add a new one. `items`: the ones it may link to. */
export default function NoticeForm({ courses, items, today, notice }: { courses: Course[]; items: Item[]; today: string; notice?: Notice }) {
  const { onSubmit, err, busy } = useAdminForm({
    schema: noticeSchema,
    action: saveNotice,
    done: (fd) => `${notice ? "Saved" : "Posted"}${fd.get("calendar") === "none" ? "" : " and on the calendar"}`,
    base: "/admin/notices",
    editing: !!notice,
  });
  const [course, setCourse] = useState(notice?.course_id ?? courses[0]?.id);
  const heading = notice ? "Edit notice" : "Post a notice";
  return (
    <form className={`box ${s.panel}${notice ? ` ${s.editing}` : ""}`} aria-label={heading} onSubmit={onSubmit} onReset={() => setCourse(notice?.course_id ?? courses[0]?.id)} noValidate>
      <h2>{heading}</h2>
      {notice && <input type="hidden" name="id" value={notice.id} />}
      <CourseSelect courses={courses} value={notice?.course_id} onChange={setCourse} />
      <label>Title<input name="title" defaultValue={notice?.title} maxLength={120} required /></label>
      {err("title")}
      <label>Message<textarea name="body" rows={4} defaultValue={notice?.body} maxLength={4000} required /></label>
      {err("body")}
      <div className={s.f2}>
        <label>Date<input type="date" name="posted_on" defaultValue={notice?.posted_on ?? today} required /></label>
        <GroupSelect value={notice?.lab_group} />
      </div>
      {err("posted_on")}
      <fieldset className={s.calopt}>
        <legend>Calendar</legend>
        <label className={s.radio}><input type="radio" name="calendar" value="none" defaultChecked={!notice?.calendar_item_id} />Don&apos;t add it to the calendar</label>
        <label className={s.radio}><input type="radio" name="calendar" value="link" defaultChecked={!!notice?.calendar_item_id} />Link it to a calendar item</label>
        <label className={s.radio}><input type="radio" name="calendar" value="new" />Add it as a new calendar item</label>
        <div className={s.optLink}>
          <label>Calendar item
            <select name="calendar_item_id" defaultValue={notice?.calendar_item_id ?? ""}>
              <option value="">Choose an item</option>
              {items.filter((x) => x.course_id === course).map((x) => (
                <option key={x.id} value={x.id}>
                  {KIND[x.kind]} · {x.title} · {formatShort(x.on_date)}{x.at_time ? `, ${pgTime(x.at_time)}` : ""}
                </option>
              ))}
            </select>
          </label>
          {err("calendar_item_id")}
          {notice?.calendar_item_id && <p className={s.hint}>To move the event itself, edit it in the Calendar tab.</p>}
        </div>
        <div className={s.optNew}>
          <label>What is it?
            <select name="new_kind">{Object.entries(KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </label>
          <div className={s.f2}>
            <label>Date<input type="date" name="new_date" defaultValue={today} /></label>
            <label>Time (optional)<input name="new_time" placeholder="8:00 AM" /></label>
          </div>
          {err("new_date")}
          {err("new_time")}
        </div>
      </fieldset>
      <label className={s.c}><input type="checkbox" name="pinned" defaultChecked={notice?.pinned} />Pin it to the top</label>
      <button className={`btn p ${s.save}`} disabled={busy}>{notice ? "Save changes" : "Post notice"}</button>
      {notice && <Link className={s.cancel} href="/admin/notices" scroll={false}>Cancel editing</Link>}
    </form>
  );
}
