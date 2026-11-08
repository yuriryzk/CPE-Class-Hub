"use client";
import { useState } from "react";
import type { ActionResult } from "@/lib/auth";
import { toast } from "./Toast";

/** A small button that runs a Server Action and shows the result. `ask` is confirmed first. */
export function ActionButton({ label, action, done, ask }: {
  label: string; action: () => Promise<ActionResult>; done: string; ask?: string;
}) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (ask && !confirm(ask)) return;
    setBusy(true);
    try {
      const r = await action();
      toast(r.ok ? done : r.message);
    } catch {
      toast("Couldn't save. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return <button type="button" className="btn s" disabled={busy} onClick={run}>{label}</button>;
}

export default function ConfirmDelete({ title, action }: { title: string; action: () => Promise<ActionResult> }) {
  return <ActionButton label="Delete" action={action} done="Deleted" ask={`Delete ${title}? This can't be undone.`} />;
}
