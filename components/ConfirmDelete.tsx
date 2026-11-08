"use client";
import type { ActionResult } from "@/lib/auth";
import { toast } from "./Toast";

/** A small button that runs a Server Action and shows the result. `ask` is confirmed first. */
export function ActionButton({ label, action, done, ask }: {
  label: string; action: () => Promise<ActionResult>; done: string; ask?: string;
}) {
  const run = async () => {
    if (ask && !confirm(ask)) return;
    const r = await action();
    toast(r.ok ? done : r.message);
  };
  return <button type="button" className="btn s" onClick={run}>{label}</button>;
}

export default function ConfirmDelete({ title, action }: { title: string; action: () => Promise<ActionResult> }) {
  return <ActionButton label="Delete" action={action} done="Deleted" ask={`Delete ${title}? This can't be undone.`} />;
}
