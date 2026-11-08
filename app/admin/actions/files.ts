"use server";
import { withOfficer, type ActionResult } from "@/lib/auth";
import { fileSchema } from "@/lib/schemas";
import { serverClient } from "@/lib/supabase/server";

export async function saveFile(fd: FormData): Promise<ActionResult> {
  const p = fileSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const id = String(fd.get("id") ?? "");
  return withOfficer(async () => {
    const db = await serverClient();
    const { error } = id ? await db.from("files").update(p.data).eq("id", id) : await db.from("files").insert(p.data);
    if (error) throw error;
  });
}

export async function deleteFile(id: string): Promise<ActionResult> {
  return withOfficer(async () => {
    const { error } = await (await serverClient()).from("files").delete().eq("id", id);
    if (error) throw error;
  });
}
