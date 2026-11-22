"use client";
import Link from "next/link";
import { useState } from "react";
import { saveCourseNote } from "@/app/admin/actions/notes";
import { noteSchema } from "@/lib/schemas";
import type { Course, CourseNote } from "@/lib/types";
import s from "../Admin.module.css";
import CourseSelect from "./CourseSelect";
import { useAdminForm } from "./useAdminForm";

/** Add or edit a course note or link. */
export default function NoteForm({ courses, note }: { courses: Course[]; note?: CourseNote }) {
  const { onSubmit, err, busy } = useAdminForm({
    schema: noteSchema,
    action: saveCourseNote,
    done: () => (note ? "Saved" : "Note added"),
    base: "/admin/notes",
    editing: !!note,
  });
  const [kind, setKind] = useState<"note" | "link">(note?.kind ?? "note");
  const heading = note ? "Edit note" : "Add a note";
  return (
    <form className={`box ${s.panel}${note ? ` ${s.editing}` : ""}`} aria-label={heading} onSubmit={onSubmit} noValidate>
      <h2>{heading}</h2>
      {note && <input type="hidden" name="id" value={note.id} />}
      <CourseSelect courses={courses} value={note?.course_id} />
      <label>What is it?
        <select name="kind" value={kind} onChange={(e) => setKind(e.target.value as "note" | "link")}>
          <option value="note">A note</option>
          <option value="link">A link</option>
        </select>
      </label>
      <label>Title<input name="title" defaultValue={note?.title} maxLength={120} required /></label>
      {err("title")}
      {kind === "note" ? (
        <>
          <label>Note<textarea name="body" rows={4} defaultValue={note?.body ?? ""} maxLength={2000} required /></label>
          {err("body")}
        </>
      ) : (
        <>
          <label>Link<input name="url" defaultValue={note?.url ?? ""} placeholder="https://" required /></label>
          {err("url")}
        </>
      )}
      <button className={`btn p ${s.save}`} disabled={busy}>{note ? "Save changes" : "Add note"}</button>
      {note && <Link className={s.cancel} href="/admin/notes" scroll={false}>Cancel editing</Link>}
    </form>
  );
}
