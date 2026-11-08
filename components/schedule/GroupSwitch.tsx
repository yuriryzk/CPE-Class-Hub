"use client";
import { useSyncExternalStore } from "react";
import { GROUP_KEY, parseGroup } from "@/lib/picks";
import type { Group } from "@/lib/week";

const EVENT = "classhub:group";
const read = (): Group => {
  try {
    return parseGroup(localStorage.getItem(GROUP_KEY));
  } catch {
    return "";
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

/** The lab group saved in this browser; "" (Both) on the server. */
export const useGroup = () => useSyncExternalStore(subscribe, read, (): Group => "");

function setGroup(g: Group) {
  try {
    if (g) localStorage.setItem(GROUP_KEY, g);
    else localStorage.removeItem(GROUP_KEY);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export default function GroupSwitch() {
  const group = useGroup();
  return (
    <div className="seg" role="group" aria-label="Lab group">
      {([["", "Both"], ["G1", "G1"], ["G2", "G2"]] as const).map(([v, label]) => (
        <button key={v} type="button" aria-pressed={group === v} onClick={() => setGroup(v)}>{label}</button>
      ))}
    </div>
  );
}
