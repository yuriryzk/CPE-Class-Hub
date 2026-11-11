import { addDays, formatShort, formatTime, fromPgTime, sundayOf } from "./time";
import { KIND, type Course, type Item, type Notice } from "./types";
import { isPastNotice, otherGroup, type Group } from "./week";

/** One phone's daily-summary choices, as claimed by claim_push_digests. `courses` empty = every course. */
export type PushSub = { endpoint: string; p256dh: string; auth: string; courses: string[]; lab_group: Group; since: string };
export type Digest = { title: string; body: string; url: string };
export type DigestData = { courses: Course[]; notices: Notice[]; items: Item[] };

const MAX_LINES = 4;
const DEADLINE: Item["kind"][] = ["quiz_exam", "due"];

/**
 * What one phone gets tonight, or null when there is nothing for it:
 * quizzes and due dates for tomorrow, quizzes and due dates added since its last summary, and notices posted since
 * then. Only its courses and lab group; done or passed notices and a notice whose calendar item is already listed are
 * left out. `today` is the Manila date.
 */
export function buildDigest(sub: Pick<PushSub, "courses" | "lab_group" | "since">, d: DigestData, today: string): Digest | null {
  const tomorrow = addDays(today, 1);
  const since = Date.parse(sub.since);
  const mine = (x: { course_id: string; lab_group: Group }) =>
    (!sub.courses.length || sub.courses.includes(x.course_id)) && !otherGroup(x.lab_group, sub.lab_group);
  const isNew = (x: { created_at: string }) => Date.parse(x.created_at) > since;
  const code = (id: string) => d.courses.find((c) => c.id === id)?.code ?? "";
  const when = (x: Item) => `${formatShort(x.on_date)}${x.at_time ? `, ${formatTime(fromPgTime(x.at_time))}` : ""}`;

  const deadlines = d.items.filter((x) => DEADLINE.includes(x.kind) && mine(x));
  const soon = deadlines.filter((x) => x.on_date === tomorrow);
  const added = deadlines.filter((x) => x.on_date > tomorrow && isNew(x));
  const listed = new Set([...soon, ...added].map((x) => x.id));
  const notices = d.notices.filter(
    (n) => mine(n) && isNew(n) && !isPastNotice(n, d.items, today) && !(n.calendar_item_id && listed.has(n.calendar_item_id)),
  );

  const lines = [
    ...soon.map((x) => `Tomorrow · ${code(x.course_id)} ${KIND[x.kind]}: ${x.title}${x.at_time ? `, ${formatTime(fromPgTime(x.at_time))}` : ""}`),
    ...added.map((x) => `New · ${code(x.course_id)} ${KIND[x.kind]}: ${x.title} (${when(x)})`),
    ...notices.map((n) => `Notice · ${code(n.course_id)}: ${n.title}`),
  ];
  if (!lines.length) return null;

  const first = [...soon, ...added].sort((a, b) => a.on_date.localeCompare(b.on_date))[0];
  const url = first ? `/?week=${sundayOf(first.on_date)}` : notices.length === 1 ? `/notices?course=${code(notices[0].course_id)}` : "/notices";
  const more = lines.length - MAX_LINES;
  return {
    title: soon.length ? `Class Hub: ${soon.length} due or tested tomorrow` : "Class Hub: what's new",
    body: [...lines.slice(0, MAX_LINES), ...(more > 0 ? [`and ${more} more`] : [])].join("\n"),
    url,
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
