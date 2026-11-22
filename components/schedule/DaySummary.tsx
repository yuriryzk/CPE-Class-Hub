"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { attachItems, capDots, daySummary, stripDots, swipeDir } from "@/lib/day";
import { addDays, formatTime, formatShort, fromPgTime } from "@/lib/time";
import { KIND, type Course, type Item } from "@/lib/types";
import { filterWeek, otherGroup, type Block, type WeekData } from "@/lib/week";
import NoticeRows from "../notices/NoticeRows";
import { LinkPending } from "../Pending";
import type { Row } from "../notices/NoticeCard";
import { openDetail } from "./DetailsDialog";
import { Dots, Tag, where } from "./EventCard";
import { tabKeys } from "./tabKeys";
import { useGroup } from "./GroupSwitch";
import { savePicks } from "./PicksSync";
import { useViewFilter } from "./ViewFilter";
import s from "./DaySummary.module.css";

type Props = {
  week: WeekData | null; courses: Course[]; sel: string[]; today: string; weekStart: string; thisWeek: string;
  /** termWeek's answer: a week number, a break's name, or null outside the term */
  tw: number | string | null;
  /** upcoming quizzes and due dates (every lab group), or null when they failed to load */
  upcoming: Item[] | null; notices: Row[]; course?: string; codes: string[]; weekParam?: string; retry: string;
};

const DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const parts = (d: string) => { const t = new Date(`${d}T00:00:00Z`); return { wd: t.getUTCDay(), day: t.getUTCDate(), month: t.getUTCMonth() }; };
const andList = (l: string[]) => (l.length < 2 ? l.join("") : `${l.slice(0, -1).join(", ")} and ${l[l.length - 1]}`);
const hm = (min: number) => formatTime(min).replace(/ [AP]M$/, "");
type Panel = "classes" | "due" | "notices";
const PANELS: Panel[] = ["classes", "due", "notices"];

/** Pointer handlers that report a finished sideways swipe (see swipeDir); vertical drags stay page scrolls. */
function useSwipe(on: (dir: 1 | -1) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onPointerDown: (e: React.PointerEvent) => { start.current = { x: e.clientX, y: e.clientY }; },
    onPointerUp: (e: React.PointerEvent) => {
      const s0 = start.current;
      start.current = null;
      const d = s0 ? swipeDir(e.clientX - s0.x, e.clientY - s0.y) : 0;
      if (d) on(d);
    },
    onPointerCancel: () => { start.current = null; },
  };
}

/**
 * Phones' Schedule: one day at a time, modelled on a tear-off calendar. A week row, a strip of the seven days, the
 * day's date sheet with its first and last class, and a pager of the day's classes, what is due and
 * this week's notices. Desktop keeps the timetable.
 */
export default function DaySummary(p: Props) {
  const group = useGroup();
  const vf = useViewFilter(); // the browse filter (ViewFilter chips): narrows this day view too
  const days = Array.from({ length: 7 }, (_, i) => addDays(p.weekStart, i));
  const todayIdx = days.indexOf(p.today);
  // Today when it is in this week, else the same weekday; kept when changing weeks.
  const [picked, pick] = useState(todayIdx >= 0 ? todayIdx : parts(p.today).wd);
  const [panel, setPanel] = useState<Panel>("classes");
  // The sheet being torn off (forward) or covered (backward) while the flip plays; null when still.
  const [leaving, setLeaving] = useState<{ i: number; dir: 1 | -1 } | null>(null);
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setLeaving(null), 400); // in case animationend never fires
    return () => clearTimeout(t);
  }, [leaving]);
  /** Show day i of this week, tearing the sheet off (or dropping one back) unless motion is reduced. */
  const go = (i: number) => {
    if (i < 0 || i > 6 || i === picked) return;
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) setLeaving({ i: picked, dir: i > picked ? 1 : -1 });
    pick(i);
  };
  const sheetSwipe = useSwipe((d) => go(picked + d));
  const panelSwipe = useSwipe((d) => setPanel((cur) => PANELS[Math.min(2, Math.max(0, PANELS.indexOf(cur) + d))]));
  const course = (id: string) => p.courses.find((c) => c.id === id);
  const href = (w: string) => `/?${new URLSearchParams({ week: w, ...(p.course && { course: p.course }) })}`;
  const date = days[picked];
  const { wd } = parts(date);

  const title = typeof p.tw === "number" ? `Week ${p.tw}` : p.weekStart === p.thisWeek ? "This week" : `Week of ${formatShort(p.weekStart).slice(4)}`;
  const end = parts(days[6]);
  const range = typeof p.tw === "string" ? `${p.tw}, no classes`
    : `${parts(days[0]).day}${parts(days[0]).month === end.month ? "" : ` ${MONTH[parts(days[0]).month].slice(0, 3)}`}–${end.day} ${MONTH[end.month].slice(0, 3)}`;

  const weekRow = (
    <div className={s.wrow}>
      {/* The arrows hug the week's name, so they read as changing the week; Today stands apart. */}
      <nav className={s.wnav} aria-label="Week">
        <Link className={s.arw} href={href(addDays(p.weekStart, -7))} aria-label="Last week">‹<LinkPending /></Link>
        <span className={s.wname}><h1>{title}</h1><span className={s.range}>{range}</span></span>
        <Link className={s.arw} href={href(addDays(p.weekStart, 7))} aria-label="Next week">›<LinkPending /></Link>
      </nav>
      <Link className={s.today} href={href(p.thisWeek)} onClick={() => pick(parts(p.today).wd)}>Today<LinkPending /></Link>
    </div>
  );
  const showing = p.codes.length > 0 && (
    <p className={s.showing}>
      Showing {andList(p.codes)} · <Link href={p.weekParam ? `/?${new URLSearchParams({ week: p.weekParam })}` : "/"} onClick={() => savePicks([])}>Clear<LinkPending /></Link>
    </p>
  );
  // Phones show the week row in both views (the day summary and the Week timetable).
  const top = <div className={`ph ${s.top}`}>{weekRow}{showing}</div>;
  if (!p.week) {
    return (
      <>
      {top}
      <section aria-label="Day summary" className={`ph v-day ${s.sum}`}>
        <p className="box empty">Couldn&apos;t load the calendar. <a href={p.retry}>Try again.</a></p>
      </section>
      </>
    );
  }

  const week = filterWeek(p.week, vf.courses, vf.groups);
  const dots = stripDots(week, p.weekStart, p.sel, group, vf.groups);
  const sum = daySummary(date, week, p.sel, group, vf.groups);
  const dueRows = (p.upcoming ?? []).filter((i) => !otherGroup(i.lab_group, group)).slice(0, 3);
  const notices = p.notices.filter((r) => !otherGroup(r.group, group));
  const offs = sum.extras.filter((i) => i.kind === "no_class");
  const others = sum.extras.filter((i) => i.kind !== "no_class" && !i.at_time);
  const att = attachItems(sum.classes, others);
  const nextDay = days.findIndex((d, i) => i > picked && daySummary(d, week, p.sel, group, vf.groups).classes.length > 0);

  const flank = (b: Block | null, label: string, min: (b: Block) => number) => (
    <span className={s.fl}>
      {b && <><i style={{ "--c": course(b.e.course)?.color } as React.CSSProperties} />{label}<strong>{hm(min(b))}</strong>{course(b.e.course)?.code}</>}
    </span>
  );
  const blockRow = (b: Block) => {
    const c = course(b.e.course);
    const key = b.e.t === "slot" ? b.e.slot.id : b.e.item.id;
    const open = () => openDetail(b.e.t === "slot" ? { t: "slot", id: b.e.slot.id, date } : { t: "item", id: b.e.item.id });
    const agenda = b.e.t === "slot" ? b.e.slot.agenda : null;
    const name = b.e.t === "slot" ? agenda ?? c?.name : `${KIND[b.e.item.kind]}: ${b.e.item.title}`;
    const meta = b.e.t === "slot" ? [agenda && c?.name, b.e.slot.lab_group, where(b.e.slot)].filter(Boolean).join(" · ") : b.e.item.lab_group;
    return (
      <button key={key} type="button" className={s.it} style={{ "--c": c?.color } as React.CSSProperties} onClick={open}>
        <time>{hm(b.start)}<br />{hm(b.end)}</time>
        <span><Tag c={c} /> <b>{name}</b>{meta && <em>{b.e.t === "slot" && b.e.slot.online && <Dots />}{meta}</em>}</span>
      </button>
    );
  };
  /** `sub`: listed under its course's class, so the course tag is not repeated. */
  const itemRow = (i: Item, when?: string, sub?: boolean) => {
    const c = course(i.course_id);
    return (
      <button key={i.id} type="button" className={sub ? `${s.it} ${s.sub}` : s.it} style={{ "--c": c?.color } as React.CSSProperties} onClick={() => openDetail({ t: "item", id: i.id })}>
        <time>{when ?? (i.at_time ? hm(fromPgTime(i.at_time)) : KIND[i.kind])}</time>
        <span>{!sub && <><Tag c={c} /> </>}<b>{i.title}</b>{i.lab_group && <em>{i.lab_group}</em>}</span>
      </button>
    );
  };
  const dueWhen = (i: Item) => {
    const n = Math.round((Date.parse(i.on_date) - Date.parse(p.today)) / 864e5);
    return `${DAY[parts(i.on_date).wd].slice(0, 3)} · ${n === 0 ? "today" : n === 1 ? "tomorrow" : `${n} days`}`;
  };
  /**
   * Day i's whole date card, a page of a tear-off calendar. The card being torn off (or the one being covered when going
   * back) is not the shown day: it is hidden from screen readers and marked data-leaving.
   */
  const page = (i: number, cls: string) => {
    const d = days[i], pd = parts(d), sm = i === picked ? sum : daySummary(d, week, p.sel, group, vf.groups), old = i !== picked;
    const rel = d === p.today ? " · Today" : d === addDays(p.today, 1) ? " · Tomorrow" : "";
    return (
      <div key={d} className={`${s.sheet} ${cls}`} role={old ? undefined : "group"} aria-label={old ? undefined : `${DAY[pd.wd]} ${pd.day} ${MONTH[pd.month]}`}
        aria-hidden={old || undefined} data-leaving={old ? "" : undefined} onAnimationEnd={(e) => e.target === e.currentTarget && setLeaving(null)}
        style={{ "--c": sm.first ? course(sm.first.e.course)?.color ?? "#fff" : "#fff" } as React.CSSProperties}>
        <span className={s.mon}>{MONTH[pd.month]}</span>
        {flank(sm.first, "first", (b) => b.start)}
        <span className={s.num}>{pd.day}</span>
        {flank(sm.last, "done", (b) => b.end)}
        <span className={s.wd}>{DAY[pd.wd]}{rel}</span>
      </div>
    );
  };
  const tabs: [Panel, string, number][] = [["classes", "Classes", sum.classes.length], ["due", "Due", dueRows.length], ["notices", "Notices", notices.length]];

  return (
    <>
    {top}
    <section aria-label="Day summary" className={`ph v-day swap ${s.sum}`}>
      <div key={p.weekStart} className={`${s.strip} wk-in`} role="tablist" aria-label="Day" onKeyDown={tabKeys}>
        {days.map((d, i) => {
          const pd = parts(d), cd = capDots(dots[i]);
          return (
            <button key={d} type="button" role="tab" aria-selected={i === picked} tabIndex={i === picked ? 0 : -1} aria-label={`${DAY[pd.wd].slice(0, 3)} ${pd.day}`}
              data-today={d === p.today ? "" : undefined} onClick={() => go(i)}>
              <span className={s.wl}>{d === p.today ? "Today" : DAY[pd.wd][0]}</span><b>{pd.day}</b>
              <span className={s.dots}>{cd.shown.map((c, j) => <i key={j} style={{ "--c": course(c)?.color } as React.CSSProperties} />)}{cd.more > 0 && <small>+{cd.more}</small>}</span>
            </button>
          );
        })}
      </div>

      <div className={s.pad} {...sheetSwipe}>
        {leaving?.dir === -1 && page(leaving.i, "")}
        {page(picked, leaving?.dir === -1 ? s.drop : "")}
        {leaving?.dir === 1 && page(leaving.i, s.tear)}
      </div>

      <div className={s.pager} role="tablist" aria-label="Show" onKeyDown={tabKeys}>
        {tabs.map(([k, label, n]) => (
          <button key={k} type="button" role="tab" aria-selected={panel === k} tabIndex={panel === k ? 0 : -1} onClick={() => setPanel(k)}>{label} {n}</button>
        ))}
      </div>
      <div role="tabpanel" aria-label={tabs.find((t) => t[0] === panel)![1]} className={s.panel} {...panelSwipe}>
        <div key={`${date}-${panel}`} className={leaving ? s.rise : s.fade}>
        {panel === "classes" && (
          <div className="box rows">
            {/* A course's due dates and other untimed items sit under its class, as one group */}
            {att.groups.map((g) => g.items.length
              ? <div key={`g${g.b.e.t === "slot" ? g.b.e.slot.id : g.b.e.item.id}`} className={s.grp}>{blockRow(g.b)}{g.items.map((i) => itemRow(i, undefined, true))}</div>
              : blockRow(g.b))}
            {!sum.classes.length && (
              <p className={s.none}>
                {typeof p.tw === "string" ? `${p.tw}, no classes` : `No classes ${date === p.today ? "today" : `on ${DAY[wd]}`}`}
                {nextDay > 0 && <> · <button type="button" className={s.link} onClick={() => go(nextDay)}>{DAY[parts(days[nextDay]).wd]} has {daySummary(days[nextDay], week, p.sel, group, vf.groups).classes.length} ›</button></>}
              </p>
            )}
            {offs.length > 0 && (
              <p className={s.off}>No class: {offs.map((i, j) => (
                <span key={i.id}>{j > 0 && ", "}<button type="button" className={s.link} onClick={() => openDetail({ t: "item", id: i.id })}>{course(i.course_id)?.code}{i.lab_group && ` (${i.lab_group})`}</button></span>
              ))}</p>
            )}
            {att.loose.map((i) => itemRow(i))}
          </div>
        )}
        {panel === "due" && (p.upcoming === null
          ? <p className="box empty">Couldn&apos;t load the calendar. <a href={p.retry}>Try again.</a></p>
          : dueRows.length ? <div className="box rows">{dueRows.map((i) => itemRow(i, dueWhen(i)))}</div>
          : <p className="box empty">Nothing due or tested from today on.</p>)}
        {panel === "notices" && (
          <>
            <NoticeRows rows={notices} empty="Nothing posted this week." />
            <p className={s.more}><Link href="/notices">All notices<LinkPending /></Link></p>
          </>
        )}
        </div>
      </div>
    </section>
    </>
  );
}
