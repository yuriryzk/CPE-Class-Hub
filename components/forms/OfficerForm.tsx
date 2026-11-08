"use client";
import { addOfficer } from "@/app/admin/actions/officers";
import { officerSchema } from "@/lib/schemas";
import s from "../Admin.module.css";
import { useAdminForm } from "./useAdminForm";

/** Head officer only: let another Google account manage the site. */
export default function OfficerForm() {
  const { onSubmit, err, busy } = useAdminForm({ schema: officerSchema, action: addOfficer, done: () => "Officer added", base: "/admin/officers", editing: false });
  return (
    <form className={`box ${s.panel}`} aria-label="Add an officer" onSubmit={onSubmit} noValidate>
      <h2>Add an officer</h2>
      <p className={s.hint}>They sign in with the Google account for this email.</p>
      <label>Email<input type="email" name="email" placeholder="name@gmail.com" required /></label>
      {err("email")}
      <button className={`btn p ${s.save}`} disabled={busy}>Add officer</button>
    </form>
  );
}
