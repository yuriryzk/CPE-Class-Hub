"use server";
import { withOfficer, type ActionResult } from "@/lib/auth";
import { noticeSchema } from "@/lib/schemas";
import { serverClient } from "@/lib/supabase/server";

export async function saveNotice(fd: FormData): Promise<ActionResult> {
  const p = noticeSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const n = p.data;
  const id = String(fd.get("id") ?? "");
  return withOfficer(async (officer) => {
    const db = await serverClient();
    let itemId = n.calendar === "link" ? n.calendar_item_id : null;
    let newItem: string | null = null;
    if (n.calendar === "new") {
      const { data, error } = await db
        .from("calendar_items")
        .insert({ course_id: n.course_id, kind: n.new_kind, title: n.title, on_date: n.new_date, at_time: n.new_time, lab_group: n.lab_group })
        .select("id")
        .single();
      if (error) throw error;
      itemId = newItem = data.id;
    }
    const row = { course_id: n.course_id, title: n.title, body: n.body, posted_on: n.posted_on, lab_group: n.lab_group, pinned: n.pinned, calendar_item_id: itemId };
    const { error } = id
      ? await db.from("notices").update(row).eq("id", id)
      : await db.from("notices").insert({ ...row, created_by: officer.email });
    if (error) {
      if (newItem) await db.from("calendar_items").delete().eq("id", newItem);
      throw error;
    }
  });
}

export async function deleteNotice(id: string): Promise<ActionResult> {
  return withOfficer(async () => {
    const { error } = await (await serverClient()).from("notices").delete().eq("id", id);
    if (error) throw error;
  });
}

export async function toggleNoticeDone(id: string): Promise<ActionResult> {
  return withOfficer(async () => {
    const db = await serverClient();
    const { data, error } = await db.from("notices").select("done").eq("id", id).single();
    if (error) throw error;
    const { error: e2 } = await db.from("notices").update({ done: !data.done }).eq("id", id);
    if (e2) throw e2;
  });
}
