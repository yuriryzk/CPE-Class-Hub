import webpush from "web-push";
import { buildDigest, sendAll, type PushSub } from "@/lib/push";
import { adminClient } from "@/lib/supabase/admin";
import { addDays, manilaToday } from "@/lib/time";
import type { Course, Item, Notice, Slot, SlotChange, Term, TermBreak } from "@/lib/types";

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

  // Tomorrow, the way the Schedule builds a day: every weekly slot, tomorrow's calendar items, the term and its
  // breaks; then the notices linked to tomorrow's items. Archived (past-semester) rows are left out: the service
  // role skips RLS, so the filters are explicit here.
  const tomorrow = addDays(today, 1);
  const [courses, term, breaks] = await Promise.all([
    db.from("courses").select("*").is("archived_in", null),
    db.from("term").select("starts_on, week_count").single(),
    db.from("term_breaks").select("starts_on, label"),
  ]);
  const failed = courses.error ?? term.error ?? breaks.error;
  if (failed) return Response.json({ error: failed.message }, { status: 500 });
  const courseIds = (courses.data as Course[]).map((c) => c.id);
  const empty = { data: [] as never[], error: null };
  const [slots, items, slotChanges] = courseIds.length
    ? await Promise.all([
        db.from("class_slots").select("*").in("course_id", courseIds).order("starts_at"),
        db.from("calendar_items").select("*").in("course_id", courseIds).eq("on_date", tomorrow),
        db.from("slot_groups").select("slot_id, on_date, lab_group, starts_at, ends_at, online, room, agenda").eq("on_date", tomorrow),
      ])
    : [empty, empty, empty];
  const failed2 = slots.error ?? items.error ?? slotChanges.error;
  if (failed2) return Response.json({ error: failed2.message }, { status: 500 });
  // slot_groups names a slot, not a course: keep only the live courses' one-day changes.
  const liveSlots = new Set((slots.data as Slot[]).map((s) => s.id));
  const ids = (items.data as Item[]).map((i) => i.id);
  const notices = ids.length
    ? await db.from("notices").select("*").eq("done", false).in("calendar_item_id", ids)
    : { data: [] as Notice[], error: null };
  if (notices.error) return Response.json({ error: notices.error.message }, { status: 500 });
  const data = {
    courses: courses.data as Course[],
    week: {
      slots: slots.data as Slot[], items: items.data as Item[], notices: notices.data as Notice[], linkedItems: [],
      term: term.data as Term, breaks: breaks.data as TermBreak[],
      slotChanges: (slotChanges.data as SlotChange[]).filter((c) => liveSlots.has(c.slot_id)),
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
