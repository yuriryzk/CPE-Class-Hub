"use client";
import { useMemo, useState } from "react";
import { ingestDeadlines } from "@/app/admin/actions/ingest";
import { toast } from "@/components/Toast";
import type { Course } from "@/lib/types";
import { parseSyllabus, type ParsedDeadline } from "@/lib/syllabus";
import s from "./Admin.module.css";
import x from "./SyllabusIngest.module.css";

type Row = ParsedDeadline & { include: boolean };

const KINDS = [
  ["quiz_exam", "Quiz/exam"],
  ["due", "Due"],
] as const;

/**
 * Paste a syllabus (or pick a .txt/.md file), find the deadline-looking lines,
 * check the preview, then post them as notices — course rows also land on the
 * calendar. Parsing is the pure lib/syllabus function; nothing leaves the
 * browser until "Add deadlines" is pressed.
 */
export default function SyllabusIngest({ courses, today }: { courses: Course[]; today: string }) {
  const [text, setText] = useState("");
  const [parsedText, setParsedText] = useState(""); // the text `rows` was parsed from
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const refs = useMemo(() => courses.map((c) => ({ id: c.id, code: c.code, course_no: c.course_no })), [courses]);
  const stale = text !== parsedText;
  const kept = rows.filter((r) => r.include);

  const parse = (t: string) => {
    setRows(parseSyllabus(t, refs, today).map((r) => ({ ...r, include: true })));
    setParsedText(t);
  };
  const patch = (i: number, p: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...p } : r)));

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const t = await f.text();
    setText(t);
    parse(t);
  };

  const confirm = async () => {
    setBusy(true);
    try {
      const res = await ingestDeadlines(
        kept.map((r) => ({ title: r.title, body: r.raw, on_date: r.date, kind: r.kind, course_id: r.course_id || null, at_time: r.at_time || null })),
      );
      if (!res.ok) return toast(res.message);
      toast(res.failed ? `Added ${res.created}; ${res.failed} failed` : `Added ${res.created} ${res.created === 1 ? "deadline" : "deadlines"}`);
      if (!res.failed) {
        setText("");
        setRows([]);
        setParsedText("");
      }
    } catch {
      toast("Couldn't save. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`box ${s.panel} ${x.wide}`} aria-label="Add deadlines from a syllabus">
      <h2>Syllabus deadlines</h2>
      <p className={s.hint}>
        Paste a syllabus or pick a .txt/.md file. Lines with a date and a word like quiz, exam, due or report are
        offered as deadlines; check them, then add them as notices{courses.length ? " (course rows also go on the calendar)" : ""}.
      </p>
      <label>Syllabus text
        <textarea
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Quiz 1: OSI model — Oct 14\nCNS midterm — 2026-12-10\nProject report due 10/21"}
          spellCheck={false}
        />
      </label>
      <div className={x.tools}>
        <button type="button" className="btn" onClick={() => parse(text)} disabled={!text.trim() && rows.length === 0}>
          {rows.length ? "Parse again" : "Find deadlines"}
        </button>
        <label className={`btn ${x.filebtn}`}>
          Load a file
          <input type="file" accept=".txt,.md,text/plain" className={x.file} onChange={(e) => void onFile(e.target.files?.[0])} />
        </label>
      </div>
      {stale && rows.length > 0 && <p className={s.hint}>The text changed since the last parse — press Parse again to refresh the preview.</p>}

      {parsedText !== "" && (
        <div className={x.preview} aria-label="Parsed deadlines">
          <p className={s.hint}>
            {rows.length ? `${kept.length} of ${rows.length} ${rows.length === 1 ? "line" : "lines"} kept` : "No deadline-looking lines found."}
          </p>
          {rows.map((r, i) => (
            <div key={r.line} className={`${x.row}${r.include ? "" : ` ${x.off}`}`}>
              <div className={x.fields}>
                <label className={x.keep} title={r.include ? "Remove this deadline" : "Keep this deadline"}>
                  <input type="checkbox" checked={r.include} onChange={(e) => patch(i, { include: e.target.checked })} />
                </label>
                <input className={x.title} value={r.title} maxLength={120} onChange={(e) => patch(i, { title: e.target.value })} aria-label="Title" />
                <select value={r.course_id ?? ""} onChange={(e) => patch(i, { course_id: e.target.value || null })} aria-label="Course">
                  <option value="">General</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
                </select>
                <select value={r.kind} onChange={(e) => patch(i, { kind: e.target.value as Row["kind"] })} aria-label="Kind">
                  {KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <input type="date" value={r.date} onChange={(e) => patch(i, { date: e.target.value })} aria-label="Date" />
                <input type="time" value={r.at_time ?? ""} onChange={(e) => patch(i, { at_time: e.target.value || null })} aria-label="Time" />
                <button type="button" className={x.rm} onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} aria-label={`Remove ${r.title}`}>×</button>
              </div>
              <small className={x.raw} title={r.raw}>{r.raw}</small>
            </div>
          ))}
          {kept.length > 0 && (
            <button type="button" className={`btn p ${s.save}`} disabled={busy || stale} onClick={() => void confirm()}>
              {busy ? "Adding…" : `Add ${kept.length} ${kept.length === 1 ? "deadline" : "deadlines"}`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
