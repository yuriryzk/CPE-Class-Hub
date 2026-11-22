import type { Item } from "./types";

/**
 * Syllabus deadline ingest: a pure, deterministic parser. No network, no LLM —
 * a line counts as a deadline when it has both a recognizable date and a
 * deadline keyword (quiz, exam, due, assignment, ...). The officer reviews the
 * preview before anything is written, so false positives are cheap.
 */

export type SyllabusCourse = { id: string; code: string; course_no: string };

export type ParsedDeadline = {
  /** Line number in the pasted text, for keys and "raw line" display. */
  line: number;
  /** The line as pasted, trimmed. */
  raw: string;
  /** The line cleaned up for a title (bullets and numbering stripped, 120 chars max). */
  title: string;
  /** YYYY-MM-DD */
  date: string;
  kind: "quiz_exam" | "due";
  /** Matched course id, or null for a class-wide ("General") notice. */
  course_id: string | null;
  /** 'HH:MM' when the line carries a time like "9:00 AM". */
  at_time: string | null;
};

const MONTH =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const MON = `(?:${MONTH})`;
const ORD = "(?:st|nd|rd|th)?";
const YR = "(\\d{4}|\\d{2})";

// One alternation, tried left to right: ISO first so "2026-10-14" isn't read as "10-14".
const DATE_RE = new RegExp(
  [
    `\\b(\\d{4})-(\\d{1,2})-(\\d{1,2})\\b`, // 2026-10-14
    `\\b(\\d{1,2})\\/(\\d{1,2})(?:\\/(\\d{2,4}))?\\b`, // 10/14, 10/14/2026, 10/14/26
    `\\b(${MON})\\.?\\s+(\\d{1,2})${ORD}(?:,?\\s*${YR})?\\b`, // Oct 14, October 14 2026, Oct. 14, 2026
    `\\b(\\d{1,2})${ORD}\\s+(?:of\\s+)?(${MON})\\.?(?:,?\\s*${YR})?\\b`, // 14 Oct, 14th of October 2026
  ].join("|"),
  "i",
);

const TIME_RE = /\b(\d{1,2}):(\d{2})\s*(am|pm)\b|\b(\d{1,2})\s*(am|pm)\b/i;

const EXAM_RE = /\b(?:quiz(?:zes)?|exams?|midterms?|finals?|prelims?|long\s+quiz)\b/i;
const DUE_RE = /\b(?:due|assignments?|projects?|reports?|submissions?|deadlines?|deliverables?|homework|papers?|defen[cs]es?|thesis)\b/i;

const MONTH_INDEX: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const pad = (n: number) => String(n).padStart(2, "0");
const valid = (y: number, m: number, d: number) => {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
};
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

function yearOf(raw: string | undefined): number | null {
  if (!raw) return null;
  if (raw.length === 4) return Number(raw);
  const yy = Number(raw);
  return yy <= 69 ? 2000 + yy : 1900 + yy;
}

/** The first date-looking span in `line`, as YYYY-MM-DD, or null. `today` supplies the year for yearless dates. */
export function findDate(line: string, today: string): string | null {
  const m = DATE_RE.exec(line);
  if (!m) return null;
  const refYear = Number(today.slice(0, 4));
  let y: number | null = null, mo = 0, d = 0;
  const g = (i: number) => m[i];
  if (g(1) !== undefined) { // ISO
    y = Number(g(1)); mo = Number(g(2)); d = Number(g(3));
  } else if (g(4) !== undefined) { // M/D(/Y)
    mo = Number(g(4)); d = Number(g(5)); y = yearOf(g(6));
  } else if (g(7) !== undefined) { // Mon D (Y)
    mo = MONTH_INDEX[g(7).slice(0, 3).toLowerCase()] + 1; d = Number(g(8)); y = yearOf(g(9));
  } else { // D Mon (Y)
    d = Number(g(10)); mo = MONTH_INDEX[g(11).slice(0, 3).toLowerCase()] + 1; y = yearOf(g(12));
  }
  if (!valid(y ?? refYear, mo, d)) return null;
  // A yearless date already past is almost always next year's occurrence in a syllabus.
  if (y === null) {
    const thisYear = iso(refYear, mo, d);
    y = thisYear < today ? refYear + 1 : refYear;
  }
  return iso(y, mo, d);
}

/** 'HH:MM' for the first "9:00 AM"/"9 AM" time in the line, else null. */
export function findTime(line: string): string | null {
  const m = TIME_RE.exec(line);
  if (!m) return null;
  let h = Number(m[1] ?? m[4]);
  const min = Number(m[2] ?? 0);
  if (h < 1 || h > 12 || min > 59) return null;
  if ((m[3] ?? m[5]).toLowerCase() === "pm" && h !== 12) h += 12;
  if ((m[3] ?? m[5]).toLowerCase() === "am" && h === 12) h = 0;
  return `${pad(h)}:${pad(min)}`;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The course a line names ("CS101 Quiz 1", "CPE 308 report"), or null. Times are blanked first so "2 PM" isn't read as course PM. */
export function findCourse(line: string, courses: SyllabusCourse[]): string | null {
  const hay = line.replace(new RegExp(TIME_RE.source, "gi"), " ");
  let best: { id: string; at: number } | null = null;
  for (const c of courses) {
    for (const token of [c.course_no, c.code]) {
      const t = token.trim();
      if (!t) continue;
      const m = new RegExp(`(^|[^A-Za-z0-9])${escapeRe(t)}(?=$|[^A-Za-z0-9])`, "i").exec(hay);
      if (m && (best === null || m.index < best.at)) best = { id: c.id, at: m.index };
    }
  }
  return best?.id ?? null;
}

const cleanTitle = (line: string) =>
  line
    .replace(/^\s*(?:[-*•–—▪◦]|\d{1,2}[.)])\s+/, "")
    .trim()
    .slice(0, 120);

/**
 * Parse pasted syllabus text into deadline rows. `today` (YYYY-MM-DD, Manila)
 * supplies the year for dates written without one. Lines without both a date and
 * a deadline keyword are ignored; everything else is returned in order.
 */
export function parseSyllabus(text: string, courses: SyllabusCourse[], today: string): ParsedDeadline[] {
  const out: ParsedDeadline[] = [];
  const seen = new Set<string>();
  text.split(/\r?\n/).forEach((rawLine, i) => {
    const raw = rawLine.trim();
    if (!raw) return;
    const exam = EXAM_RE.test(raw);
    const due = !exam && DUE_RE.test(raw);
    if (!exam && !due) return;
    const date = findDate(raw, today);
    if (!date) return;
    const title = cleanTitle(raw) || raw.slice(0, 120);
    const kind: Item["kind"] = exam ? "quiz_exam" : "due";
    const course_id = findCourse(raw, courses);
    const key = `${date}|${title.toLowerCase()}|${course_id ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ line: i + 1, raw, title, date, kind, course_id, at_time: findTime(raw) });
  });
  return out;
}
