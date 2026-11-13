import { z } from "zod";
import { parseTime, toPgTime, weekdayOf } from "./time";

// Inputs are what Object.fromEntries(formData) gives: strings, or absent.
const TIME_MSG = "Use times like 7:30 AM";
const HTTPS_MSG = "Links must start with https://";
const CODE_MSG = "Codes are up to 8 characters";

const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const text = (min: number, max: number) => z.string().trim().min(min).max(max);
const optText = (max: number) => z.preprocess(blank, text(1, max).optional()).transform((v) => v ?? null);
const checkbox = z.preprocess((v) => v === "on", z.boolean());
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-11-15");
const sunday = date.refine((d) => weekdayOf(d) === 7, "Must be a Sunday");
const num = (min: number, max: number) => z.coerce.number().int().min(min).max(max);
const kind = z.enum(["quiz_exam", "due", "no_class", "extra_class"]);
const group = z.enum(["", "G1", "G2"]);

const minutes = z.string().transform((s, ctx) => {
  const m = parseTime(s);
  if (m === null) ctx.issues.push({ code: "custom", message: TIME_MSG, input: s });
  return m ?? 0;
});
const optTime = z
  .preprocess(blank, minutes.optional())
  .transform((m) => (m === undefined ? null : toPgTime(m)));

export const itemSchema = z.object({
  course_id: z.string().min(1),
  kind,
  title: text(1, 120),
  on_date: date,
  at_time: optTime,
  notes: optText(2000),
  lab_group: group.default(""),
});

export const noticeSchema = z
  .object({
    course_id: z.string().min(1),
    title: text(1, 120),
    body: text(1, 4000),
    posted_on: date,
    lab_group: group.default(""),
    pinned: checkbox,
    calendar: z.enum(["none", "link", "new"]),
    calendar_item_id: z.preprocess(blank, z.string().optional()).transform((v) => v ?? null),
    new_kind: z.preprocess(blank, kind.optional()),
    new_date: z.preprocess(blank, date.optional()),
    new_time: optTime,
  })
  .superRefine((n, ctx) => {
    if (n.calendar === "link" && !n.calendar_item_id)
      ctx.addIssue({ code: "custom", path: ["calendar_item_id"], message: "Pick a calendar item" });
    if (n.calendar === "new" && !(n.new_kind && n.new_date))
      ctx.addIssue({ code: "custom", path: ["new_date"], message: "Fill in the calendar item" });
  });

export const slotSchema = z
  .object({
    course_id: z.string().min(1),
    weekday: num(1, 7),
    starts_at: minutes,
    ends_at: minutes,
    room: optText(40),
    lab_group: group,
  })
  .refine((s) => s.ends_at > s.starts_at, { path: ["ends_at"], message: "End time must be after the start time" })
  .transform((s) => ({ ...s, starts_at: toPgTime(s.starts_at), ends_at: toPgTime(s.ends_at) }));

export const fileSchema = z.object({
  course_id: z.string().transform((v) => v || null),
  title: text(1, 120),
  file_type: text(1, 30),
  week_label: optText(60),
  url: z.string().trim().regex(/^https:\/\/.+/, HTTPS_MSG),
});

export const courseSchema = z.object({
  name: text(1, 80),
  code: z.string().trim().regex(/^[A-Za-z0-9-]{1,8}$/, CODE_MSG),
  instructor: z.string().trim().max(80, "Instructor names are up to 80 characters").default(""),
  course_no: z.string().trim().max(20, "Course numbers are up to 20 characters").default(""),
});

export const termSchema = z.object({ starts_on: sunday, week_count: num(1, 52) });

export const breakSchema = z.object({ starts_on: sunday, label: text(1, 60) });

/** A browser push subscription plus the classmate's choices; courses empty = every course. */
export const pushSchema = z.object({
  // Only the browsers' push services, so nobody can make the nightly job call an address of their choosing.
  endpoint: z.string().max(1000).regex(
    /^https:\/\/(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[\w.-]+\.push\.apple\.com|[\w.-]+\.notify\.windows\.com)\/\S+$/,
    "Not a browser push address",
  ),
  keys: z.object({
    p256dh: z.string().regex(/^[\w-]{1,200}=*$/),
    auth: z.string().regex(/^[\w-]{1,100}=*$/),
  }),
  courses: z.array(z.uuid()).max(9),
  lab_group: group,
});

export const officerSchema = z.object({ email: z.string().trim().toLowerCase().pipe(z.email()) });

/** The Courses form: rows named id0/name0/code0/instructor0/course_no0 ... Errors land on the field name plus {i}. */
export const coursesSchema = z.record(z.string(), z.unknown()).transform((d, ctx) => {
  const rows: { id: string; name: string; code: string; instructor: string; course_no: string }[] = [];
  for (let i = 0; d[`id${i}`] !== undefined; i++) {
    const p = courseSchema.safeParse({
      name: d[`name${i}`], code: d[`code${i}`], instructor: d[`instructor${i}`], course_no: d[`course_no${i}`],
    });
    if (p.success) rows.push({ id: String(d[`id${i}`]), ...p.data });
    else for (const x of p.error.issues) ctx.issues.push({ code: "custom", path: [`${String(x.path[0])}${i}`], message: x.message, input: d });
  }
  return rows;
});
