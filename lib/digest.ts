import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildDigest, sendAll, type Digest, type DigestData, type PushSub } from "./push";
import { addDays } from "./time";
import type { Course, Item, Notice, Slot, SlotChange, Term, TermBreak } from "./types";

/** How long a digest may sit in a push service's queue (same as the cron route always used). */
const DIGEST_TTL = 12 * 3600;

/**
 * Sets the VAPID keys web-push signs with; throws when they are missing or malformed. Both the cron route and the
 * officer's test send call this first, so a bad key fails before anything is claimed or sent.
 */
export function configureWebPush(): void {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
}

/**
 * Tomorrow's data for the digest: every weekly slot, tomorrow's calendar items, the notices linked to them, the
 * term and its breaks — the same day the Schedule builds. Throws with the database's message on failure.
 */
export async function loadDigestData(db: SupabaseClient, today: string): Promise<DigestData> {
  const tomorrow = addDays(today, 1);
  const [courses, slots, items, term, breaks, slotChanges] = await Promise.all([
    db.from("courses").select("*"),
    db.from("class_slots").select("*").order("starts_at"),
    db.from("calendar_items").select("*").eq("on_date", tomorrow),
    db.from("term").select("starts_on, week_count").single(),
    db.from("term_breaks").select("starts_on, label"),
    db.from("slot_groups").select("slot_id, on_date, lab_group, starts_at, ends_at, online, room, agenda").eq("on_date", tomorrow),
  ]);
  const failed = courses.error ?? slots.error ?? items.error ?? term.error ?? breaks.error ?? slotChanges.error;
  if (failed) throw new Error(failed.message);
  const ids = ((items.data ?? []) as Item[]).map((i) => i.id);
  const notices = await db.from("notices").select("*").eq("done", false).in("calendar_item_id", ids);
  if (notices.error) throw new Error(notices.error.message);
  return {
    courses: (courses.data ?? []) as Course[],
    week: {
      slots: (slots.data ?? []) as Slot[],
      items: (items.data ?? []) as Item[],
      notices: (notices.data ?? []) as Notice[],
      linkedItems: [],
      term: term.data as Term,
      breaks: (breaks.data ?? []) as TermBreak[],
      slotChanges: (slotChanges.data ?? []) as SlotChange[],
    },
  };
}

export type SendResult = { sent: number; skipped: number; failed: number; gone: string[] };

/**
 * Sends each phone its digest built from `data` (none when the phone has nothing tomorrow). The default sender is
 * web-push; tests can inject one to inspect the exact payload. `gone` endpoints (404/410) are returned for the
 * caller to delete.
 */
export async function sendDigests(
  subs: PushSub[],
  data: DigestData,
  today: string,
  send: (s: PushSub, d: Digest) => Promise<unknown> = (s, d) =>
    webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(d), { TTL: DIGEST_TTL }),
): Promise<SendResult> {
  return sendAll(subs, (s) => buildDigest(s, data, today), send);
}
