"use server";
import { withOfficer, type ActionResult } from "@/lib/auth";
import { coursesSchema } from "@/lib/schemas";
import { serverClient } from "@/lib/supabase/server";

/** Saves all nine names and codes. Courses are never added or removed. */
export async function saveCourses(fd: FormData): Promise<ActionResult> {
  const p = coursesSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  // Checked up front so a clash never leaves some courses saved and others not.
  const seen = new Set<string>();
  for (const r of p.data) {
    if (seen.has(r.code.toLowerCase())) return { ok: false, message: `Another course already uses ${r.code}` };
    seen.add(r.code.toLowerCase());
  }
  const ctx: { courseCode?: string } = {};
  return withOfficer(async () => {
    const db = await serverClient();
    for (const r of p.data) {
      ctx.courseCode = r.code; // for the 23505 message if this row clashes
      const { error } = await db.from("courses").update({ name: r.name, code: r.code }).eq("id", r.id);
      if (error) throw error;
    }
  }, ctx);
}
