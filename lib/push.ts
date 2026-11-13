import { addDays, formatShort, formatTime, fromPgTime, sundayOf } from "./time";
import { KIND, type Course, type Notice } from "./types";
import { dayEntries, otherGroup, type Group, type WeekData } from "./week";

/** One phone's daily-summary choices, as claimed by claim_push_digests. `courses` empty = every course. */
export type PushSub = { endpoint: string; p256dh: string; auth: string; courses: string[]; lab_group: Group };
export type Digest = { title: string; body: string; url: string };
/** Tomorrow's data: all weekly slots, tomorrow's calendar items, tomorrow's notices, the term and its breaks. */
export type DigestData = { courses: Course[]; week: WeekData };

const MAX_LINES = 6;

/**
 * Tomorrow, for one phone, or null when it has nothing tomorrow: its classes and calendar items (the same day the
 * Schedule shows, so cancelled classes, breaks and lab groups match), then notices dated tomorrow. A notice linked to
 * one of tomorrow's items rides on that item's line instead of its own. `today` is the Manila date.
 */
export function buildDigest(sub: Pick<PushSub, "courses" | "lab_group">, d: DigestData, today: string): Digest | null {
  const tomorrow = addDays(today, 1);
  const code = (id: string) => d.courses.find((c) => c.id === id)?.code ?? "";
  const notices = d.week.notices.filter(
    (n) => !n.done && (!sub.courses.length || sub.courses.includes(n.course_id)) && !otherGroup(n.lab_group, sub.lab_group),
  );
  const entries = dayEntries(tomorrow, d.week, sub.courses, sub.lab_group);
  const shownItems = new Set(entries.flatMap((e) => (e.t === "item" ? [e.item.id] : [])));
  const noteOf = (id: string) => notices.find((n) => n.calendar_item_id === id);

  const lines = entries.map((e) => {
    if (e.t === "slot") {
      const s = e.slot;
      const where = [s.lab_group, s.room].filter(Boolean).join(", ");
      return `${formatTime(fromPgTime(s.starts_at))} · ${code(s.course_id)} class${where ? ` (${where})` : ""}`;
    }
    const x = e.item;
    const time = x.at_time ? formatTime(fromPgTime(x.at_time)) : x.class_slot_id ? formatTime(e.m) : "";
    const note = noteOf(x.id);
    return `${time ? `${time} · ` : ""}${code(x.course_id)} ${KIND[x.kind]}: ${x.title}${note ? ` (notice: ${note.title})` : ""}`;
  });
  const own = (n: Notice) => n.posted_on === tomorrow && !(n.calendar_item_id && shownItems.has(n.calendar_item_id));
  lines.push(...notices.filter(own).map((n) => `Notice · ${code(n.course_id)}: ${n.title}`));
  if (!lines.length) return null;

  const more = lines.length - MAX_LINES;
  return {
    title: `Tomorrow, ${formatShort(tomorrow)}`,
    body: [...lines.slice(0, MAX_LINES), ...(more > 0 ? [`and ${more} more`] : [])].join("\n"),
    url: `/?week=${sundayOf(tomorrow)}`,
  };
}

/**
 * Sends each phone its digest (none when there is nothing). Push services answer 404 or 410 for a subscription that
 * no longer exists; those endpoints come back in `gone` so the caller deletes them. Other failures are only counted:
 * the day is already claimed, so a phone misses one summary rather than getting two.
 */
export async function sendAll<S extends { endpoint: string }>(
  subs: S[],
  digestFor: (s: S) => Digest | null,
  send: (s: S, d: Digest) => Promise<unknown>,
): Promise<{ sent: number; skipped: number; failed: number; gone: string[] }> {
  const out = { sent: 0, skipped: 0, failed: 0, gone: [] as string[] };
  await Promise.all(subs.map(async (s) => {
    const d = digestFor(s);
    if (!d) return void out.skipped++;
    try {
      await send(s, d);
      out.sent++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) out.gone.push(s.endpoint);
      else out.failed++;
    }
  }));
  return out;
}
