"use client";
import Link from "next/link";
import { saveItem } from "@/app/admin/actions/items";
import { KIND, pgTime } from "@/components/schedule/EventCard";
import { itemSchema } from "@/lib/schemas";
import { formatShort } from "@/lib/time";
import type { Course, Item } from "@/lib/types";
import s from "../Admin.module.css";
import CourseSelect from "./CourseSelect";
import { useAdminForm } from "./useAdminForm";

/** Add or edit a one-off calendar item. */
export default function ItemForm({ courses, today, item }: { courses: Course[]; today: string; item?: Item }) {
  const { onSubmit, err, busy } = useAdminForm({
    schema: itemSchema,
    action: saveItem,
    done: () => (item ? "Saved" : "Added to the calendar"),
    base: "/admin/calendar",
    editing: !!item,
  });
  const heading = item ? "Edit calendar item" : "Add to the calendar";
  return (
    <form className={`box ${s.panel}${item ? ` ${s.editing}` : ""}`} aria-label={heading} onSubmit={onSubmit} noValidate>
      <h2>{heading}</h2>
      <p className={s.hint}>{item ? "Changing the date or time marks it as moved." : "For one-off things. Regular classes go in Class."}</p>
      {item && <input type="hidden" name="id" value={item.id} />}
      <CourseSelect courses={courses} value={item?.course_id} />
      <label>What is it?
        <select name="kind" defaultValue={item?.kind}>{Object.entries(KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      </label>
      <label>Title<input name="title" defaultValue={item?.title} maxLength={120} required /></label>
      {err("title")}
      <div className={s.f2}>
        <label>Date<input type="date" name="on_date" defaultValue={item?.on_date ?? today} required /></label>
        <label>Time (optional)<input name="at_time" defaultValue={item?.at_time ? pgTime(item.at_time) : ""} placeholder="8:00 AM" /></label>
      </div>
      {err("on_date")}
      {err("at_time")}
      {item?.moved_from_date && (
        <p className={s.hint}>
          Originally {formatShort(item.moved_from_date)}{item.moved_from_time ? `, ${pgTime(item.moved_from_time)}` : ""}. Set it back to clear the Moved label.
        </p>
      )}
      <label>Notes (optional)<textarea name="notes" rows={3} defaultValue={item?.notes ?? ""} maxLength={2000} placeholder="What to bring, what it covers, where to submit" /></label>
      {err("notes")}
      <button className={`btn p ${s.save}`} disabled={busy}>{item ? "Save changes" : "Add to the calendar"}</button>
      {item && <Link className={s.cancel} href="/admin/calendar" scroll={false}>Cancel editing</Link>}
    </form>
  );
}
