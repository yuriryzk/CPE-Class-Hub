"use client";
import { useSyncExternalStore } from "react";

const KEY = "classhub.noticesView";
const EVENT = "classhub:noticesView";
type View = "cards" | "list";

const read = (): View => {
  try {
    return localStorage.getItem(KEY) === "list" ? "list" : "cards";
  } catch {
    return "cards";
  }
};
const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};

/** The notices view saved in this browser; Cards on the server. */
export const useView = () => useSyncExternalStore(subscribe, read, (): View => "cards");

function setView(v: View) {
  try {
    localStorage.setItem(KEY, v);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export default function ViewSwitch() {
  const view = useView();
  return (
    <div className="seg" role="group" aria-label="View">
      {([["cards", "Cards"], ["list", "List"]] as const).map(([v, label]) => (
        <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>{label}</button>
      ))}
    </div>
  );
}
