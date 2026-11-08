"use server";
import { withOfficer, type ActionResult } from "@/lib/auth";
import { coursesSchema } from "@/lib/schemas";
import { serverClient } from "@/lib/supabase/server";

/** Saves all nine names and codes. Courses are never added or removed. */
export async function saveCourses(fd: FormData): Promise<ActionResult> {
  const p = coursesSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  // Clashes inside the form are caught here; clashes with the stored codes (a swap, say) fail in the database.
  const seen = new Set<string>();
  for (const r of p.data) {
    if (seen.has(r.code.toLowerCase())) return { ok: false, message: `Another course already uses ${r.code}` };
    seen.add(r.code.toLowerCase());
  }
  const ctx: { courseCode?: string } = {};
  return withOfficer(async () => {
    // One statement in the database, so a refused code changes no course.
    const { error } = await (await serverClient()).rpc("save_courses", { rows: p.data });
    if (error) {
      // The error names the clashing code, such as: Key (lower(code))=(cns) already exists.
      const hit = error.details?.match(/=\((.*)\)/)?.[1];
      ctx.courseCode = p.data.find((r) => r.code.toLowerCase() === hit)?.code ?? hit;
      throw error;
    }
  }, ctx);
}
