"use client";
import { useEffect, useState } from "react";
import { previewDigest, sendTestDigest, type DigestResult } from "@/app/admin/actions/digest";
import type { Digest } from "@/lib/push";
import { toast } from "./Toast";
import s from "./Admin.module.css";

const swUrl = `/sw.js${process.env.NODE_ENV === "development" ? "?dev=1" : ""}`;
type State = "checking" | "none" | "ready";

/**
 * Admin "Digest" tab: preview or immediately send this browser's phone the same daily digest the 9 PM cron sends.
 * The subscription is anonymous, so the test goes to whichever phone this browser is subscribed as.
 */
export default function DigestTest() {
  const [state, setState] = useState<State>("checking");
  const [endpoint, setEndpoint] = useState("");
  const [digest, setDigest] = useState<Digest | null>(null);
  const [busy, setBusy] = useState<"" | "preview" | "send">("");

  useEffect(() => {
    (async () => {
      try {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) return setState("none");
        const reg = await navigator.serviceWorker.register(swUrl);
        const sub = await reg.pushManager.getSubscription();
        if (!sub) return setState("none");
        setEndpoint(sub.endpoint);
        setState("ready");
      } catch {
        setState("none");
      }
    })();
  }, []);

  const run = async (which: "preview" | "send") => {
    if (which === "send" && !confirm("Send the test digest to this browser's phone now? Tonight's 9 PM summary still goes out.")) return;
    setBusy(which);
    try {
      const r: DigestResult = which === "preview" ? await previewDigest(endpoint) : await sendTestDigest(endpoint);
      if (which === "preview") {
        if (r.ok) setDigest(r.digest ?? null);
        else toast(r.message);
      } else {
        toast(r.message);
      }
    } catch {
      toast("Couldn't load. Try again.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className={`box ${s.panel}`} aria-label="Test the daily digest">
      <h2>Test digest</h2>
      <p className={s.hint}>
        The 9 PM cron sends every subscribed phone tomorrow&apos;s classes, quizzes and due dates. Preview shows what this
        browser&apos;s phone would get; send pushes it now. Neither uses up tonight&apos;s summary.
      </p>
      {state === "checking" && <p className={s.hint}>Checking this browser…</p>}
      {state === "none" && (
        <p className={s.hint}>
          This browser isn&apos;t subscribed to the digest. Turn on notifications from the footer&apos;s Notifications panel
          on the phone you want to test, then open this page there.
        </p>
      )}
      {state === "ready" && (
        <>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button type="button" className="btn s" disabled={busy !== ""} onClick={() => run("preview")}>
              {busy === "preview" ? "Loading…" : "Preview"}
            </button>
            <button type="button" className="btn s" disabled={busy !== ""} onClick={() => run("send")}>
              {busy === "send" ? "Sending…" : "Send test"}
            </button>
          </div>
          {digest && (
            <div style={{ marginTop: 16 }}>
              <b>{digest.title}</b>
              <p className={s.msg} style={{ marginTop: 6 }}>{digest.body}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
