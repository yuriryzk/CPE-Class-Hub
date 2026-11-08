"use client";
import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { toast } from "@/components/Toast";
import Calendar, { type CalendarProps } from "./Calendar";
import s from "./DownloadPng.module.css";

/** Saves the shown week (selected courses and lab group) as a PNG drawn 1280 px wide with all seven days. */
export default function DownloadPng({ title, name, ...cal }: CalendarProps & { title: string; name: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!busy || !ref.current) return;
    toPng(ref.current, { pixelRatio: 1 })
      .then((url) => {
        const a = document.createElement("a");
        a.href = url;
        a.download = `schedule-week-${name}.png`;
        a.click();
      })
      .catch(() => toast("Couldn't make the image. Try again."))
      .finally(() => setBusy(false));
  }, [busy, name]);
  return (
    <>
      <button type="button" className="btn" disabled={busy} onClick={() => setBusy(true)}>Download image</button>
      {busy && (
        <div className={s.off} inert>
          <div ref={ref} className={s.shot}>
            <p className={s.title}>{title}</p>
            <Calendar {...cal} wide />
          </div>
        </div>
      )}
    </>
  );
}
