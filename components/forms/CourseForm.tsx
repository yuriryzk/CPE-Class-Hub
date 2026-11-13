"use client";
import { saveCourses } from "@/app/admin/actions/courses";
import { coursesSchema } from "@/lib/schemas";
import type { Course } from "@/lib/types";
import s from "../Admin.module.css";
import { useAdminForm } from "./useAdminForm";

/** Rename the nine courses. Each keeps its colour; none can be added or removed. */
export default function CourseForm({ courses }: { courses: Course[] }) {
  const { onSubmit, err, busy } = useAdminForm({
    schema: coursesSchema,
    action: saveCourses,
    done: () => "Courses saved",
    base: "/admin/courses",
    editing: true, // keeps what was typed instead of clearing the form
  });
  return (
    <form className={`box ${s.panel}`} aria-label="Your courses" onSubmit={onSubmit} noValidate>
      <h2>Your {courses.length} courses</h2>
      <p className={s.hint}>Type each course&apos;s name, a short code of up to 8 characters, its instructor and its course no. (like CPE 308). Each keeps its colour everywhere.</p>
      {courses.map((c, i) => (
        <div key={c.id}>
          <div className={s.crow}>
            <span className={s.sw} style={{ background: c.color }} aria-hidden="true" />
            <input type="hidden" name={`id${i}`} value={c.id} />
            <input name={`name${i}`} defaultValue={c.name} aria-label={`Course ${i + 1} name`} maxLength={80} required />
            <input name={`code${i}`} defaultValue={c.code} aria-label={`Course ${i + 1} code`} maxLength={8} required />
            <input className={s.ins} name={`instructor${i}`} defaultValue={c.instructor} aria-label={`Course ${i + 1} instructor`} placeholder="Instructor (optional)" maxLength={80} />
            <input className={s.cno} name={`course_no${i}`} defaultValue={c.course_no} aria-label={`Course ${i + 1} course no.`} placeholder="Course no." maxLength={20} />
          </div>
          {err(`name${i}`)}
          {err(`code${i}`)}
          {err(`instructor${i}`)}
          {err(`course_no${i}`)}
        </div>
      ))}
      <button className={`btn p ${s.save}`} disabled={busy}>Save courses</button>
    </form>
  );
}
