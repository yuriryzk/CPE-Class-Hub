"use client";
import { useSyncExternalStore } from "react";

const sub = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

/** On Schedule: says the page is the copy the service worker saved, when there is no connection. */
export default function OfflineNote() {
  const offline = useSyncExternalStore(sub, () => !navigator.onLine, () => false);
  return offline ? <p className="box empty" role="status" style={{ marginBottom: "var(--gap)" }}>You&apos;re offline; this is the last saved week.</p> : null;
}
