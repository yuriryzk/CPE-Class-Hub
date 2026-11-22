"use client";
import { toast } from "@/components/Toast";
import { weekText } from "@/lib/copyWeek";
import type { Course } from "@/lib/types";
import type { WeekData } from "@/lib/week";
import { useGroup } from "./GroupSwitch";

type Props = { week: WeekData; courses: Course[]; sel: string[]; weekStart: string; title: string };

/** Copies the shown week (selected courses and lab group) as chat-ready plain text; the toast confirms. */
export default function CopyWeek({ week, courses, sel, weekStart, title }: Props) {
  const group = useGroup();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(weekText(week, weekStart, courses, sel, group, title));
      toast("Week copied");
    } catch {
      toast("Couldn't copy. Try again.");
    }
  };
  return <button type="button" className="btn" onClick={copy}>Copy week</button>;
}
