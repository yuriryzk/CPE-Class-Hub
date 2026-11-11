"use client";
import { useEffect, useRef, useState } from "react";
import { removePush, savePush } from "@/app/actions/push";
import { toast } from "@/components/Toast";
import { GENERAL, type Course } from "@/lib/types";
import type { Group } from "@/lib/week";
import d from "./schedule/DetailsDialog.module.css";
import s from "./NotifySettings.module.css";

const KEY = "classhub.push"; // this browser's last saved choices, to show them again
const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
type State = "checking" | "unsupported" | "ios-install" | "denied" | "off" | "on";

const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const installed = () => matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
const keyBytes = (b64url: string) => Uint8Array.from(atob(b64url.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const swUrl = `/sw.js${process.env.NODE_ENV === "development" ? "?dev=1" : ""}`;

/** Footer "Notifications": opt in to the daily summary, pick courses and lab group, or turn it off. No account. */
export default function NotifySettings({ courses }: { courses: Course[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<State>("checking");
  const [picked, setPicked] = useState<string[]>([]); // empty = every course
  const [group, setGroup] = useState<Group>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register(swUrl).catch(() => {});
  }, []);

  const check = async () => {
    let saved = { courses: [] as string[], lab_group: "" as Group };
    try {
      saved = JSON.parse(localStorage.getItem(KEY) ?? "null") ?? saved;
      setPicked(saved.courses);
      setGroup(saved.lab_group);
    } catch {}
    if (!VAPID || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window))
      return setState(isIos() && !installed() ? "ios-install" : "unsupported");
    if (Notification.permission === "denied") return setState("denied");
    const reg = await navigator.serviceWorker.register(swUrl);
    const sub = await reg.pushManager.getSubscription();
    // Push services sometimes replace a subscription, and the server deletes ones that stop working. Saving the
    // current one again keeps "On" true; without it the server could hold no row while this panel says On.
    if (sub) savePush({ ...sub.toJSON(), ...saved }).catch(() => {});
    setState(sub ? "on" : "off");
  };

  const open = () => {
    ref.current?.showModal();
    check().catch(() => setState("unsupported"));
  };

  const run = async (job: () => Promise<string | undefined>) => {
    setBusy(true);
    try {
      const done = await job();
      if (done) toast(done);
    } catch {
      toast("Couldn't change notifications. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const save = () => run(async () => {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      setState(perm === "denied" ? "denied" : "off");
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription())
      ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID) }));
    const r = await savePush({ ...sub.toJSON(), courses: picked, lab_group: group });
    if (!r.ok) return r.message;
    try {
      localStorage.setItem(KEY, JSON.stringify({ courses: picked, lab_group: group }));
    } catch {}
    const was = state;
    setState("on");
    return was === "on" ? "Notification choices saved" : "Notifications on. Summaries come around 7 PM.";
  });

  const turnOff = () => run(async () => {
    const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
    if (sub) {
      const r = await removePush(sub.endpoint);
      if (!r.ok) return r.message;
      await sub.unsubscribe();
    }
    setState("off");
    return "Notifications off";
  });

  const on = (id: string) => !picked.length || picked.includes(id);
  const toggle = (id: string) => {
    const next = courses.filter((c) => (c.id === id ? !on(id) : on(c.id))).map((c) => c.id);
    if (next.length) setPicked(next.length === courses.length ? [] : next); // at least one course; [] means all
  };
  const choosing = state === "off" || state === "on";

  return (
    <>
      <button type="button" className={s.link} onClick={open}>Notifications</button>
      <dialog ref={ref} className={d.dlg} style={{ "--c": GENERAL } as React.CSSProperties} aria-labelledby="ntf">
        <div className={d.dh}>
          <div>
            <p>{state === "on" ? "On for this device" : "Daily summary"}</p>
            <h2 id="ntf">Notifications</h2>
          </div>
          <button type="button" className={d.x} aria-label="Close" onClick={() => ref.current?.close()}>×</button>
        </div>
        <div className={d.db}>
          <p>Around 7 PM: tomorrow&apos;s quizzes and due dates, plus new notices and deadlines. Nothing is sent on quiet days. No account needed.</p>
          {state === "ios-install" && (
            <p className={s.note}>On iPhone or iPad, first add Class Hub to your Home Screen: tap <b>Share</b>, then <b>Add to Home Screen</b>, and open Class Hub from there. Needs iOS 16.4 or later.</p>
          )}
          {state === "unsupported" && <p className={s.note}>This browser can&apos;t receive notifications.</p>}
          {state === "denied" && <p className={s.note}>Notifications are blocked for this site. Allow them in your browser&apos;s site settings, then open this again.</p>}
          {choosing && (
            <>
              <fieldset className={s.set}>
                <legend>Courses</legend>
                <div className={s.grid}>
                  {courses.map((c) => (
                    <label key={c.id} className={s.opt}>
                      <input type="checkbox" checked={on(c.id)} onChange={() => toggle(c.id)} />
                      <span className="sw" style={{ "--c": c.color } as React.CSSProperties} aria-hidden="true" />
                      {c.code}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className={s.set}>
                <legend>Lab group</legend>
                <div className={s.row}>
                  {([["", "Both"], ["G1", "G1"], ["G2", "G2"]] as const).map(([v, label]) => (
                    <label key={v} className={s.opt}>
                      <input type="radio" name="push-group" checked={group === v} onChange={() => setGroup(v)} />{label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className={s.row}>
                <button type="button" className="btn p" disabled={busy} onClick={save}>
                  {state === "on" ? "Save changes" : "Turn on notifications"}
                </button>
                {state === "on" && <button type="button" className="btn" disabled={busy} onClick={turnOff}>Turn off notifications</button>}
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
