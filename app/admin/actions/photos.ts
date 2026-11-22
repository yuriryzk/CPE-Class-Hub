"use server";
import { withOfficer, type ActionResult } from "@/lib/auth";
import { photoSchema } from "@/lib/schemas";
import { serverClient } from "@/lib/supabase/server";

export async function savePhoto(fd: FormData): Promise<ActionResult> {
  const p = photoSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const id = String(fd.get("id") ?? "");
  return withOfficer(async () => {
    const db = await serverClient();
    const { error } = id ? await db.from("photos").update(p.data).eq("id", id) : await db.from("photos").insert(p.data);
    if (error) throw error;
  });
}

export async function deletePhoto(id: string): Promise<ActionResult> {
  return withOfficer(async () => {
    const { error } = await (await serverClient()).from("photos").delete().eq("id", id);
    if (error) throw error;
  });
}
