import webpush from "web-push";
import { buildDigest, sendAll, type PushSub } from "@/lib/push";
import { adminClient } from "@/lib/supabase/admin";
import { addDays, manilaToday } from "@/lib/time";
import type { Course, Item, Notice, Slot, Term, TermBreak } from "@/lib/types";

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

  // Tomorrow, the way the Schedule builds a day: every weekly slot, tomorrow's calendar items, the term and its breaks;
  // then notices dated tomorrow or linked to one of tomorrow's items.
  const tomorrow = addDays(today, 1);
  const [courses, slots, items, term, breaks] = await Promise.all([
    db.from("courses").select("*"),
    db.from("class_slots").select("*").order("starts_at"),
    db.from("calendar_items").select("*").eq("on_date", tomorrow),
    db.from("term").select("starts_on, week_count").single(),
    db.from("term_breaks").select("starts_on, label"),
  ]);
  const failed = courses.error ?? slots.error ?? items.error ?? term.error ?? breaks.error;
  if (failed) return Response.json({ error: failed.message }, { status: 500 });
  const ids = (items.data as Item[]).map((i) => i.id);
  const notices = await db.from("notices").select("*").eq("done", false)
    .or(ids.length ? `posted_on.eq.${tomorrow},calendar_item_id.in.(${ids.join(",")})` : `posted_on.eq.${tomorrow}`);
  if (notices.error) return Response.json({ error: notices.error.message }, { status: 500 });
  const data = {
    courses: courses.data as Course[],
    week: {
      slots: slots.data as Slot[], items: items.data as Item[], notices: notices.data as Notice[], linkedItems: [],
      term: term.data as Term, breaks: breaks.data as TermBreak[],
    },
  };

  const result = await sendAll(
    subs,
    (s) => buildDigest(s, data, today),
    (s, d) => webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(d), { TTL: 12 * 3600 }),
  );
  if (result.gone.length) await db.from("push_subscriptions").delete().in("endpoint", result.gone);
  return Response.json({ claimed: subs.length, sent: result.sent, skipped: result.skipped, failed: result.failed, removed: result.gone.length });
}
