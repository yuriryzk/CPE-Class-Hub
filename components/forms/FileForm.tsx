"use client";
import Link from "next/link";
import { saveFile } from "@/app/admin/actions/files";
import { fileSchema } from "@/lib/schemas";
import type { Course, FileRow } from "@/lib/types";
import s from "../Admin.module.css";
import { useAdminForm } from "./useAdminForm";

/** Add or edit a file link (uploads come later). */
export default function FileForm({ courses, file }: { courses: Course[]; file?: FileRow }) {
  const { onSubmit, err, busy } = useAdminForm({
    schema: fileSchema,
    action: saveFile,
    done: () => (file ? "Saved" : "File added"),
    base: "/admin/files",
    editing: !!file,
  });
  const heading = file ? "Edit file" : "Add a file";
  return (
    <form className={`box ${s.panel}${file ? ` ${s.editing}` : ""}`} aria-label={heading} onSubmit={onSubmit} noValidate>
      <h2>{heading}</h2>
      {file && <input type="hidden" name="id" value={file.id} />}
      <label>Course
        <select name="course_id" defaultValue={file?.course_id ?? ""}>
          <option value="">General (whole class)</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
        </select>
      </label>
      <label>Title<input name="title" defaultValue={file?.title} maxLength={120} required /></label>
      {err("title")}
      <div className={s.f2}>
        <label>Type<input name="file_type" defaultValue={file?.file_type} placeholder="Slides" maxLength={30} required /></label>
        <label>Week (optional)<input name="week_label" defaultValue={file?.week_label ?? ""} placeholder="Week 3" maxLength={60} /></label>
      </div>
      {err("file_type")}
      <label>Link<input name="url" defaultValue={file?.url ?? ""} placeholder="https://" required /></label>
      {err("url")}
      <button className={`btn p ${s.save}`} disabled={busy}>{file ? "Save changes" : "Add file"}</button>
      {file && <Link className={s.cancel} href="/admin/files" scroll={false}>Cancel editing</Link>}
    </form>
  );
}
