"use server";
import { withOfficer, type ActionResult } from "@/lib/auth";
import { dutySchema } from "@/lib/schemas";
import { serverClient } from "@/lib/supabase/server";

export async function saveDuty(fd: FormData): Promise<ActionResult> {
  const p = dutySchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const d = p.data;
  const id = String(fd.get("id") ?? "");
  const row = { duty: d.duty, assignee_email: d.assignee_email, week_label: d.week_label, on_date: d.on_date, notes: d.notes };
  return withOfficer(async () => {
    const db = await serverClient();
    const { error } = id
      ? await db.from("duty_assignments").update(row).eq("id", id)
      : await db.from("duty_assignments").insert(row);
    if (error) throw error;
  });
}

export async function deleteDuty(id: string): Promise<ActionResult> {
  return withOfficer(async () => {
    const { error } = await (await serverClient()).from("duty_assignments").delete().eq("id", id);
    if (error) throw error;
  });
}
