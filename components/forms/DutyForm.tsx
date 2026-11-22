"use client";
import Link from "next/link";
import { saveDuty } from "@/app/admin/actions/duty";
import { dutySchema } from "@/lib/schemas";
import type { DutyAssignment } from "@/lib/types";
import s from "../Admin.module.css";
import { useAdminForm } from "./useAdminForm";

/** Assign a duty to an officer, for a week, a date, or ongoing (neither filled in). */
export default function DutyForm({ duty }: { duty?: DutyAssignment }) {
  const { onSubmit, err, busy } = useAdminForm({
    schema: dutySchema,
    action: saveDuty,
    done: (fd) => `${duty ? "Saved" : "Added"}: ${fd.get("duty")}`,
    base: "/admin/duty",
    editing: !!duty,
  });
  return (
    <form className={`box ${s.panel}${duty ? ` ${s.editing}` : ""}`} aria-label={duty ? "Edit duty" : "Add a duty"} onSubmit={onSubmit} noValidate>
      <h2>{duty ? "Edit duty" : "Add a duty"}</h2>
      {duty && <input type="hidden" name="id" value={duty.id} />}
      <label>Duty<input name="duty" defaultValue={duty?.duty} maxLength={80} placeholder="BLT, room cleaning, org treasurer…" required /></label>
      {err("duty")}
      <label>Officer&apos;s email<input type="email" name="assignee_email" defaultValue={duty?.assignee_email} required /></label>
      {err("assignee_email")}
      <label>Week or label (optional)<input name="week_label" defaultValue={duty?.week_label ?? ""} maxLength={60} placeholder="Week 5, Every Friday…" /></label>
      {err("week_label")}
      <label>Date (optional)<input type="date" name="on_date" defaultValue={duty?.on_date ?? ""} /></label>
      {err("on_date")}
      <label>Notes (optional)<textarea name="notes" rows={3} defaultValue={duty?.notes ?? ""} maxLength={500} /></label>
      {err("notes")}
      <button className={`btn p ${s.save}`} disabled={busy}>{duty ? "Save changes" : "Add duty"}</button>
      {duty && <Link className={s.cancel} href="/admin/duty" scroll={false}>Cancel editing</Link>}
    </form>
  );
}
