import { addDays, formatShort, formatTime, fromPgTime, sundayOf } from "./time";
import { KIND, type Course } from "./types";
import { dayEntries, otherGroup, type Group, type WeekData } from "./week";

/** What a daily summary can include: the schedule ('classes') or quizzes/exams and due dates ('quizzes_due'). */
export type DigestKind = "classes" | "quizzes_due";
export const DIGEST_KINDS: { kind: DigestKind; label: string }[] = [
  { kind: "classes", label: "Classes" },
  { kind: "quizzes_due", label: "Quizzes & deadlines" },
];

/** One phone's daily-summary choices, as claimed by claim_push_digests. `courses` empty = every course; `digest_kinds` empty/missing = everything. */
export type PushSub = { endpoint: string; p256dh: string; auth: string; courses: string[]; lab_group: Group; digest_kinds?: DigestKind[] };
export type Digest = { title: string; body: string; url: string };
/** Tomorrow's data: all weekly slots, tomorrow's calendar items, the notices linked to them, the term and its breaks. */
export type DigestData = { courses: Course[]; week: WeekData };

const MAX_LINES = 6;

/**
 * Tomorrow, for one phone, or null when it has nothing tomorrow: its classes, extra classes, quizzes/exams and due dates
 * (the same day the Schedule shows, so cancelled classes, breaks and lab groups match). "No class" items are left out,
 * and a notice only shows on the line of the quiz/exam or due date it is linked to. `today` is the Manila date.
 */
export function buildDigest(sub: Pick<PushSub, "courses" | "lab_group" | "digest_kinds">, d: DigestData, today: string): Digest | null {
  const tomorrow = addDays(today, 1);
  const code = (id: string) => d.courses.find((c) => c.id === id)?.code ?? "";
  // Picks of courses that no longer exist (a phone that saved them last semester) count as every course.
  const picks = sub.courses.filter((id) => d.courses.some((c) => c.id === id));
  const notices = d.week.notices.filter(
    (n) => !n.done && (!picks.length || picks.includes(n.course_id)) && !otherGroup(n.lab_group, sub.lab_group),
  );
  // digest_kinds empty or missing (a phone saved before the choice existed) means every kind.
  const kinds = sub.digest_kinds?.length ? sub.digest_kinds : DIGEST_KINDS.map((k) => k.kind);
  const wants = (k: DigestKind) => kinds.includes(k);
  const entries = dayEntries(tomorrow, d.week, picks, sub.lab_group).filter((e) => {
    if (e.t === "slot") return wants("classes");
    if (e.item.kind === "no_class") return false;
    return wants(e.item.kind === "extra_class" ? "classes" : "quizzes_due");
  });
  const noted = new Set(["quiz_exam", "due"]);

  const lines = entries.map((e) => {
    if (e.t === "slot") {
      const s = e.slot;
      const where = [s.lab_group, s.online ? "online" : s.room].filter(Boolean).join(", ");
      return `${formatTime(fromPgTime(s.starts_at))} · ${code(s.course_id)} class${s.agenda ? `: ${s.agenda}` : ""}${where ? ` (${where})` : ""}`;
    }
    const x = e.item;
    const time = x.at_time ? formatTime(fromPgTime(x.at_time)) : x.class_slot_id ? formatTime(e.m) : "";
    const note = noted.has(x.kind) ? notices.find((n) => n.calendar_item_id === x.id) : undefined;
    return `${time ? `${time} · ` : ""}${code(x.course_id)} ${KIND[x.kind]}: ${x.title}${note ? ` (notice: ${note.title})` : ""}`;
  });
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
