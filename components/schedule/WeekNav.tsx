import Link from "next/link";
import { addDays } from "@/lib/time";

export default function WeekNav({ weekStart, thisWeek, course }: { weekStart: string; thisWeek: string; course?: string }) {
  const href = (w: string) => `/?${new URLSearchParams({ week: w, ...(course && { course }) })}`;
  return (
    <nav className="seg" aria-label="Week">
      <Link href={href(addDays(weekStart, -7))}>← Last<span className="lg">&nbsp;week</span></Link>
      <Link href={href(thisWeek)} aria-current={weekStart === thisWeek ? "date" : undefined}>This week</Link>
      <Link href={href(addDays(weekStart, 7))}>Next<span className="lg">&nbsp;week</span> →</Link>
    </nav>
  );
}
