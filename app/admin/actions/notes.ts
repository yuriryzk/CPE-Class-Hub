"use server";
import { withOfficer, type ActionResult } from "@/lib/auth";
import { noteSchema } from "@/lib/schemas";
import { serverClient } from "@/lib/supabase/server";

export async function saveCourseNote(fd: FormData): Promise<ActionResult> {
  const p = noteSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const n = p.data;
  const id = String(fd.get("id") ?? "");
  // The table ties body to 'note' and url to 'link'; only the matching field is kept.
  const row = { course_id: n.course_id, kind: n.kind, title: n.title, body: n.kind === "note" ? n.body : null, url: n.kind === "link" ? n.url : null };
  return withOfficer(async (officer) => {
    const db = await serverClient();
    const { error } = id ? await db.from("course_notes").update(row).eq("id", id) : await db.from("course_notes").insert({ ...row, created_by: officer.email });
    if (error) throw error;
  });
}

export async function deleteCourseNote(id: string): Promise<ActionResult> {
  return withOfficer(async () => {
    const { error } = await (await serverClient()).from("course_notes").delete().eq("id", id);
    if (error) throw error;
  });
}
