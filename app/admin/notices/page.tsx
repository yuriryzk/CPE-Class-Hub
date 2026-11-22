import Link from "next/link";
import { deleteNotice, toggleNoticeDone } from "@/app/admin/actions/notices";
import AdminPage from "@/components/AdminPage";
import AdminRow from "@/components/AdminRow";
import s from "@/components/Admin.module.css";
import ConfirmDelete, { ActionButton } from "@/components/ConfirmDelete";
import NoticeForm from "@/components/forms/NoticeForm";
import { loadCourses, loadItems, loadNotices, loadSort } from "@/lib/data";
import { sortRows } from "@/lib/sort";
import { addDays, formatShort, manilaToday } from "@/lib/time";
import { isExpiredNotice, isPastNotice } from "@/lib/week";

export default async function AdminNotices({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const [courses, notices, items, sort] = await Promise.all([loadCourses(), loadNotices(), loadItems(), loadSort("notices")]);
  const today = manilaToday();
  const editing = notices.find((n) => n.id === edit);
  // Linkable: recent or upcoming items that no other notice points at (one notice per item).
  const linkable = items.filter(
    (x) => x.id === editing?.calendar_item_id || (x.on_date >= addDays(today, -7) && !notices.some((n) => n.calendar_item_id === x.id)),
  );

  return (
    <AdminPage
      tab="notices"
      form={<NoticeForm key={editing?.id ?? "new"} courses={courses} items={linkable} today={today} notice={editing} />}
      list="Notices"
      count={notices.length}
      sort={sort}
    >
      {/* Done and expired notices go last in either order; the sort is stable, so each part keeps the chosen order. */}
      {sortRows(notices, sort, courses.map((c) => c.id))
        .sort((a, b) => Number(a.done || isExpiredNotice(a, today)) - Number(b.done || isExpiredNotice(b, today)))
        .map((n) => {
          const x = items.find((i) => i.id === n.calendar_item_id);
          const past = isPastNotice(n, items, today);
          const expired = !n.done && isExpiredNotice(n, today);
          return (
            <AdminRow
              key={n.id}
              course={courses.find((c) => c.id === n.course_id)}
              title={<>{n.title}{n.done ? <span className={s.st}>Done</span> : expired ? <span className={s.st}>Expired</span> : past ? <span className={s.st}>Passed</span> : n.pinned && <span className={`${s.st} ${s.pin}`}>Pinned</span>}</>}
              details={`${formatShort(n.posted_on)}${n.expires_on ? ` · expires ${formatShort(n.expires_on)}` : ""}${n.lab_group ? ` · ${n.lab_group}` : ""}${x ? ` · on the calendar ${formatShort(x.on_date)}` : ""}`}
              past={past}
              editing={n.id === editing?.id}
              actions={<>
                <Link className="btn s" href={`/admin/notices?edit=${n.id}`}>Edit</Link>
                <ActionButton label={n.done ? "Undo done" : "Mark done"} action={toggleNoticeDone.bind(null, n.id)} done={n.done ? "Back to active" : "Marked as done"} />
                <ConfirmDelete title={n.title} action={deleteNotice.bind(null, n.id)} />
              </>}
            />
          );
        })}
    </AdminPage>
  );
}
