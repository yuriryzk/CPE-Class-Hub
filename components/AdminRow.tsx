import { Tag } from "@/components/schedule/EventCard";
import type { Course } from "@/lib/types";
import s from "./Admin.module.css";

/** One admin list row: course code, title and details, actions. */
export default function AdminRow({ course, title, details, actions, past, editing }: {
  course?: Course; title: React.ReactNode; details: React.ReactNode; actions: React.ReactNode; past?: boolean; editing?: boolean;
}) {
  return (
    <div className={[s.row, past && s.past, editing && s.editing].filter(Boolean).join(" ")} aria-current={editing || undefined}>
      <Tag c={course} />
      <div><b>{title}</b><small>{details}</small></div>
      <div className={s.acts}>{actions}</div>
    </div>
  );
}
