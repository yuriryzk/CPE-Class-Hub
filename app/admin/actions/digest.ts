"use server";
import { NotOfficerError, requireOfficer } from "@/lib/auth";
import { configureWebPush, loadDigestData, sendDigests } from "@/lib/digest";
import { buildDigest, type Digest, type PushSub } from "@/lib/push";
import { pushSchema } from "@/lib/schemas";
import { adminClient } from "@/lib/supabase/admin";
import { manilaToday } from "@/lib/time";

export type DigestResult = { ok: boolean; message: string; digest?: Digest | null };

const FAILED = "Couldn't load. Try again.";

async function officerOnly(): Promise<string | null> {
  try {
    await requireOfficer();
    return null;
  } catch (e) {
    return e instanceof NotOfficerError ? e.message : FAILED;
  }
}

/**
 * The subscription on the officer's own browser, named by the endpoint its service worker reports. push_subscriptions
 * has no account link (subscriptions are anonymous), so "own" means this device's subscription — send again from
 * another device to test that one too.
 */
async function ownSubscription(endpoint: unknown): Promise<PushSub | DigestResult> {
  const p = pushSchema.shape.endpoint.safeParse(endpoint);
  if (!p.success) return { ok: false, message: "This browser sent an invalid subscription." };
  const { data, error } = await adminClient()
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, courses, lab_group")
    .eq("endpoint", p.data)
    .maybeSingle();
  if (error) return { ok: false, message: FAILED };
  if (!data) return { ok: false, message: "This browser isn't subscribed to the digest. Turn on notifications first." };
  return data as PushSub;
}

/** What the daily digest would say to this browser's phone right now, without sending anything. */
export async function previewDigest(endpoint: unknown): Promise<DigestResult> {
  const denied = await officerOnly();
  if (denied) return { ok: false, message: denied };
  const sub = await ownSubscription(endpoint);
  if ("ok" in sub) return sub;
  try {
    const today = manilaToday();
    const digest = buildDigest(sub, await loadDigestData(adminClient(), today), today);
    return { ok: true, message: digest ? "" : "Tomorrow is empty for this phone — the digest would send nothing.", digest };
  } catch (e) {
    return { ok: false, message: (e as Error).message || FAILED };
  }
}

/**
 * Sends this browser's phone the real digest immediately, built by the same code as the 9 PM cron. It does not
 * claim the day, so tonight's scheduled summary still goes out.
 */
export async function sendTestDigest(endpoint: unknown): Promise<DigestResult> {
  const denied = await officerOnly();
  if (denied) return { ok: false, message: denied };
  const sub = await ownSubscription(endpoint);
  if ("ok" in sub) return sub;
  try {
    configureWebPush();
  } catch (e) {
    return { ok: false, message: `Push keys are not set up: ${(e as Error).message}` };
  }
  try {
    const db = adminClient();
    const today = manilaToday();
    const result = await sendDigests([sub], await loadDigestData(db, today), today);
    if (result.gone.length) await db.from("push_subscriptions").delete().in("endpoint", result.gone);
    if (result.sent) return { ok: true, message: "Test digest sent — check this device's notifications." };
    if (result.failed) return { ok: false, message: "The push service refused it. Try again later." };
    return { ok: false, message: "Tomorrow is empty for this phone — nothing was sent." };
  } catch (e) {
    return { ok: false, message: (e as Error).message || "Couldn't send. Try again." };
  }
}
