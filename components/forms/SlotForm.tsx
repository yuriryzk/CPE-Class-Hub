"use client";
import Link from "next/link";
import { saveSlot } from "@/app/admin/actions/slots";
import { pgTime } from "@/components/schedule/EventCard";
import { slotSchema } from "@/lib/schemas";
import { WEEKDAYS } from "@/lib/time";
import type { Course, Slot } from "@/lib/types";
import s from "../Admin.module.css";
import CourseSelect from "./CourseSelect";
import { useAdminForm } from "./useAdminForm";

const GROUPS = [["", "Whole class"], ["G1", "G1 only"], ["G2", "G2 only"]];

/** Add or edit a weekly class. */
export default function SlotForm({ courses, slot }: { courses: Course[]; slot?: Slot }) {
  const { onSubmit, err, busy } = useAdminForm({
    schema: slotSchema,
    action: saveSlot,
    done: () => (slot ? "Saved" : "Class added"),
    base: "/admin/classes",
    editing: !!slot,
  });
  const heading = slot ? "Edit weekly class" : "Add a weekly class";
  return (
    <form className={`box ${s.panel}${slot ? ` ${s.editing}` : ""}`} aria-label={heading} onSubmit={onSubmit} noValidate>
      <h2>{heading}</h2>
      <p className={s.hint}>Repeats every week. To cancel one day, open the class on the Schedule.</p>
      {slot && <input type="hidden" name="id" value={slot.id} />}
      <CourseSelect courses={courses} value={slot?.course_id} />
      <div className={s.f2}>
        <label>Day
          <select name="weekday" defaultValue={slot?.weekday}>{WEEKDAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}</select>
        </label>
        <label>Group
          <select name="lab_group" defaultValue={slot?.lab_group}>{GROUPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </label>
      </div>
      <div className={s.f2}>
        <label>Starts<input name="starts_at" defaultValue={slot ? pgTime(slot.starts_at) : ""} placeholder="8:00 AM" /></label>
        <label>Ends<input name="ends_at" defaultValue={slot ? pgTime(slot.ends_at) : ""} placeholder="10:00 AM" /></label>
      </div>
      {err("starts_at")}
      {err("ends_at")}
      <label>Room (optional)<input name="room" defaultValue={slot?.room ?? ""} maxLength={40} /></label>
      {err("room")}
      <button className={`btn p ${s.save}`} disabled={busy}>{slot ? "Save changes" : "Add class"}</button>
      {slot && <Link className={s.cancel} href="/admin/classes" scroll={false}>Cancel editing</Link>}
    </form>
  );
}
