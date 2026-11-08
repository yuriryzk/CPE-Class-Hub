"use server";
import { withOfficer, type ActionResult } from "@/lib/auth";
import { itemSchema } from "@/lib/schemas";
import { serverClient } from "@/lib/supabase/server";
import { movedFields } from "@/lib/week";

export async function saveItem(fd: FormData): Promise<ActionResult> {
  const p = itemSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const v = p.data;
  const id = String(fd.get("id") ?? "");
  return withOfficer(async () => {
    const db = await serverClient();
    if (!id) {
      const { error } = await db.from("calendar_items").insert(v);
      if (error) throw error;
      return;
    }
    const { data: orig, error } = await db
      .from("calendar_items").select("on_date, at_time, moved_from_date, moved_from_time").eq("id", id).single();
    if (error) throw error;
    const { error: e2 } = await db.from("calendar_items").update({ ...v, ...movedFields(orig, v.on_date, v.at_time) }).eq("id", id);
    if (e2) throw e2;
  });
}

export async function deleteItem(id: string): Promise<ActionResult> {
  return withOfficer(async () => {
    const { error } = await (await serverClient()).from("calendar_items").delete().eq("id", id);
    if (error) throw error;
  });
}
