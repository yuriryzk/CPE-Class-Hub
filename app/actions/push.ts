"use server";
import type { ActionResult } from "@/lib/auth";
import { pushSchema } from "@/lib/schemas";
import { adminClient } from "@/lib/supabase/admin";

const FAILED: ActionResult = { ok: false, message: "Couldn't save. Try again." };

/** Saves this browser's push subscription and choices (anyone may; no account). Saving again updates the choices. */
export async function savePush(input: unknown): Promise<ActionResult> {
  const p = pushSchema.safeParse(input);
  if (!p.success) return { ok: false, message: "This browser sent an invalid subscription." };
  const { endpoint, keys, courses, lab_group } = p.data;
  try {
    const { error } = await adminClient()
      .from("push_subscriptions")
      .upsert({ endpoint, p256dh: keys.p256dh, auth: keys.auth, courses, lab_group }, { onConflict: "endpoint" });
    return error ? FAILED : { ok: true };
  } catch {
    return FAILED;
  }
}

/** Forgets a subscription. Only someone holding the endpoint (that browser) can name it. */
export async function removePush(endpoint: unknown): Promise<ActionResult> {
  const p = pushSchema.shape.endpoint.safeParse(endpoint);
  if (!p.success) return FAILED;
  try {
    const { error } = await adminClient().from("push_subscriptions").delete().eq("endpoint", p.data);
    return error ? FAILED : { ok: true };
  } catch {
    return FAILED;
  }
}
