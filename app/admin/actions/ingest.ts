"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { NotOfficerError, requireOfficer } from "@/lib/auth";
import { serverClient } from "@/lib/supabase/server";
import { manilaToday } from "@/lib/time";

// Rows come from the Syllabus ingest preview, already parsed client-side by lib/syllabus.
const rowSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(4000),
  on_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-11-15"),
  kind: z.enum(["quiz_exam", "due"]),
  course_id: z.string().uuid().nullable(),
  at_time: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
});
const ingestSchema = z.array(rowSchema).min(1).max(100);

export type IngestResult = { ok: true; created: number; failed: number } | { ok: false; message: string };

/**
 * Confirmed syllabus deadlines become notices. A row with a course also gets a
 * calendar item the notice links to (like "Add it as a new calendar item" in the
 * notice form); a course-less row becomes a General notice only.
 */
export async function ingestDeadlines(rows: unknown): Promise<IngestResult> {
  const p = ingestSchema.safeParse(rows);
  if (!p.success) return { ok: false, message: "Some rows didn't look right. Parse the syllabus again." };
  try {
    const officer = await requireOfficer();
    const db = await serverClient();
    const posted_on = manilaToday();
    let created = 0;
    let failed = 0;
    for (const r of p.data) {
      let calendar_item_id: string | null = null;
      if (r.course_id) {
        const { data, error } = await db
          .from("calendar_items")
          .insert({ course_id: r.course_id, kind: r.kind, title: r.title, on_date: r.on_date, at_time: r.at_time })
          .select("id")
          .single();
        if (error) {
          failed++;
          continue;
        }
        calendar_item_id = data.id;
      }
      const { error } = await db.from("notices").insert({
        course_id: r.course_id,
        title: r.title,
        body: r.body,
        posted_on,
        calendar_item_id,
        created_by: officer.email,
      });
      if (error) {
        if (calendar_item_id) await db.from("calendar_items").delete().eq("id", calendar_item_id);
        failed++;
        continue;
      }
      created++;
    }
    revalidatePath("/", "layout");
    return { ok: true, created, failed };
  } catch (e) {
    if (e instanceof NotOfficerError) return { ok: false, message: e.message };
    return { ok: false, message: "Couldn't save. Try again." };
  }
}
