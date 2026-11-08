"use server";
import { getOfficer, NOT_OFFICER_MESSAGE, NotOfficerError, withOfficer, type ActionResult } from "@/lib/auth";
import { officerSchema } from "@/lib/schemas";
import { serverClient } from "@/lib/supabase/server";

export async function addOfficer(fd: FormData): Promise<ActionResult> {
  const p = officerSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  return withOfficer(async (me) => {
    if (me.role !== "head") throw new NotOfficerError();
    const { error } = await (await serverClient()).from("officers").insert({ email: p.data.email, role: "officer", added_by: me.email.toLowerCase() });
    if (error) throw error;
  });
}

export async function removeOfficer(email: string): Promise<ActionResult> {
  const me = await getOfficer();
  if (me?.role !== "head") return { ok: false, message: NOT_OFFICER_MESSAGE };
  if (email.toLowerCase() === me.email.toLowerCase()) return { ok: false, message: "You can't remove yourself" };
  return withOfficer(async () => {
    const { error } = await (await serverClient()).from("officers").delete().eq("email", email.toLowerCase());
    if (error) throw error;
  });
}
