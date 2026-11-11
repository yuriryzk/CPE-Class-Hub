import webpush from "web-push";
import { buildDigest, sendAll, type PushSub } from "@/lib/push";
import { adminClient } from "@/lib/supabase/admin";
import { addDays, manilaToday } from "@/lib/time";
import type { Course, Item, Notice } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * The daily summary, called by Vercel Cron around 7 PM Manila (vercel.json). Vercel sends CRON_SECRET as a Bearer
 * token. Safe to run twice: claim_push_digests hands out each phone once per Manila day.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });

  // Check the push keys before claiming anything: a missing or bad key after the claim would cost everyone today's summary.
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  } catch (e) {
    return Response.json({ error: `Push keys are not set up: ${(e as Error).message}` }, { status: 500 });
  }

  const db = adminClient();
  const today = manilaToday();
  const { data: claimed, error } = await db.rpc("claim_push_digests", { today });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const subs = (claimed ?? []) as PushSub[];
  if (!subs.length) return Response.json({ claimed: 0, sent: 0, skipped: 0, failed: 0, removed: 0 });

  // Everything any claimed phone could need: notices posted since the oldest claim, and upcoming quizzes and dues.
  const oldest = subs.map((s) => s.since).sort()[0];
  const [courses, notices, upcoming] = await Promise.all([
    db.from("courses").select("*"),
    db.from("notices").select("*").gt("created_at", oldest).eq("done", false),
    db.from("calendar_items").select("*").in("kind", ["quiz_exam", "due"]).gte("on_date", addDays(today, 1)),
  ]);
  const failed = courses.error ?? notices.error ?? upcoming.error;
  if (failed) return Response.json({ error: failed.message }, { status: 500 });
  // Items the notices link to, so a notice about a passed quiz is left out.
  const have = new Set((upcoming.data as Item[]).map((i) => i.id));
  const linkIds = (notices.data as Notice[]).flatMap((n) => (n.calendar_item_id && !have.has(n.calendar_item_id) ? [n.calendar_item_id] : []));
  const linked = linkIds.length ? await db.from("calendar_items").select("*").in("id", linkIds) : { data: [] };
  const data = { courses: courses.data as Course[], notices: notices.data as Notice[], items: [...(upcoming.data as Item[]), ...((linked.data ?? []) as Item[])] };

  const result = await sendAll(
    subs,
    (s) => buildDigest(s, data, today),
    (s, d) => webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(d), { TTL: 12 * 3600 }),
  );
  if (result.gone.length) await db.from("push_subscriptions").delete().in("endpoint", result.gone);
  return Response.json({ claimed: subs.length, sent: result.sent, skipped: result.skipped, failed: result.failed, removed: result.gone.length });
}
