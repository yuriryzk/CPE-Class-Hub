// All dates are YYYY-MM-DD strings; maths uses UTC parts so the server zone never matters.
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const toUtc = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
};
const pad = (n: number) => String(n).padStart(2, "0");

export function parseTime(s: string): number | null {
  const m = /^\s*(\d{1,2}):(\d{2})\s*(am|pm)\s*$/i.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 1 || h > 12 || min > 59) return null;
  return (h % 12) * 60 + min + (m[3].toLowerCase() === "pm" ? 720 : 0);
}

export function formatTime(min: number): string {
  const h = Math.floor(min / 60);
  return `${h % 12 || 12}:${pad(min % 60)} ${h < 12 ? "AM" : "PM"}`;
}

export const toPgTime = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}:00`;

export function fromPgTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function manilaToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(now);
}

export function manilaNowMinutes(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return get("hour") * 60 + get("minute");
}

export function addDays(d: string, n: number): string {
  const t = toUtc(d);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

/** 1 = Monday ... 7 = Sunday */
export const weekdayOf = (d: string) => toUtc(d).getUTCDay() || 7;

export const sundayOf = (d: string) => addDays(d, -(weekdayOf(d) % 7));

const parts = (d: string) => {
  const t = toUtc(d);
  return { day: t.getUTCDate(), month: MONTHS[t.getUTCMonth()], year: t.getUTCFullYear(), wd: DAYS[t.getUTCDay()] };
};

export function formatLong(d: string): string {
  const p = parts(d);
  return `${p.wd} ${p.day} ${p.month} ${p.year}`;
}

export function formatUS(d: string): string {
  const p = parts(d);
  return `${p.month} ${p.day}, ${p.year}`;
}

export function formatShort(d: string): string {
  const p = parts(d);
  return `${p.wd.slice(0, 3)} ${p.day} ${p.month.slice(0, 3)}`;
}

/** Monday to Sunday; DB weekday = index + 1 */
export const WEEKDAYS = [...DAYS.slice(1), DAYS[0]];
