"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import type { ActionResult } from "@/lib/auth";
import { toast } from "@/components/Toast";
import s from "../Admin.module.css";

/** Checks the form with the action's own schema, shows messages under fields, then saves and toasts. */
export function useAdminForm(opts: {
  schema: z.ZodType;
  action: (fd: FormData) => Promise<ActionResult>;
  done: (fd: FormData) => string;
  base: string; // the page to go back to after an edit
  editing: boolean;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const p = opts.schema.safeParse(Object.fromEntries(fd));
    if (!p.success) return setErrors(z.flattenError(p.error).fieldErrors as Record<string, string[]>);
    setErrors({});
    setBusy(true);
    const r = await opts.action(fd);
    setBusy(false);
    if (!r.ok) return toast(r.message);
    toast(opts.done(fd));
    if (opts.editing) router.replace(opts.base, { scroll: false });
    else form.reset();
  };
  const err = (name: string) => errors[name] && <p className={s.err} role="alert">{errors[name][0]}</p>;
  return { onSubmit, err, busy };
}
