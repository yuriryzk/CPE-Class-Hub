"use server";
import { withOfficer, type ActionResult } from "@/lib/auth";
import { breakSchema, termSchema } from "@/lib/schemas";
import { serverClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/time";

export async function saveTerm(fd: FormData): Promise<ActionResult> {
  const p = termSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  return withOfficer(async () => {
    const { error } = await (await serverClient()).from("term").update(p.data).eq("id", true);
    if (error) throw error;
  });
}

export async function addBreak(fd: FormData): Promise<ActionResult> {
  const p = breakSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const db = await serverClient();
  const [{ data: term }, { count }] = await Promise.all([
    db.from("term").select("starts_on, week_count").single(),
    db.from("term_breaks").select("*", { count: "exact", head: true }),
  ]);
  // The term runs for its teaching weeks plus every break week (the DB doesn't check this).
  if (term && (p.data.starts_on < term.starts_on || p.data.starts_on >= addDays(term.starts_on, 7 * (term.week_count + (count ?? 0) + 1))))
    return { ok: false, message: "That break is outside the semester" };
  return withOfficer(async () => {
    const { error } = await db.from("term_breaks").insert(p.data);
    if (error) throw error;
  });
}

export async function removeBreak(startsOn: string): Promise<ActionResult> {
  return withOfficer(async () => {
    const { error } = await (await serverClient()).from("term_breaks").delete().eq("starts_on", startsOn);
    if (error) throw error;
  });
}
