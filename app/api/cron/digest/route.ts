import { configureWebPush, loadDigestData, sendDigests } from "@/lib/digest";
import type { PushSub } from "@/lib/push";
import { adminClient } from "@/lib/supabase/admin";
import { manilaToday } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * The daily summary, called by Vercel Cron around 9 PM Manila (vercel.json). Vercel sends CRON_SECRET as a Bearer
 * token. Safe to run twice: claim_push_digests hands out each phone once per Manila day.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });

  // Check the push keys before claiming anything: a missing or bad key after the claim would cost everyone today's summary.
  try {
    configureWebPush();
  } catch (e) {
    return Response.json({ error: `Push keys are not set up: ${(e as Error).message}` }, { status: 500 });
  }

  const db = adminClient();
  const today = manilaToday();
  const { data: claimed, error } = await db.rpc("claim_push_digests", { today });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const subs = (claimed ?? []) as PushSub[];
  if (!subs.length) return Response.json({ claimed: 0, sent: 0, skipped: 0, failed: 0, removed: 0 });

  // Tomorrow's data, shared with the officer's "Send test digest" so both send the same thing.
  let data;
  try {
    data = await loadDigestData(db, today);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }

  const result = await sendDigests(subs, data, today);
  if (result.gone.length) await db.from("push_subscriptions").delete().in("endpoint", result.gone);
  return Response.json({ claimed: subs.length, sent: result.sent, skipped: result.skipped, failed: result.failed, removed: result.gone.length });
}
