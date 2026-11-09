import Link from "next/link";
import { deleteItem } from "@/app/admin/actions/items";
import AdminPage from "@/components/AdminPage";
import AdminRow from "@/components/AdminRow";
import ConfirmDelete from "@/components/ConfirmDelete";
import ItemForm from "@/components/forms/ItemForm";
import { KIND } from "@/lib/types";
import { loadCourses, loadItems, loadNotices } from "@/lib/data";
import { formatShort, formatTime, fromPgTime, manilaToday } from "@/lib/time";

export default async function AdminCalendar({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const [courses, items, notices] = await Promise.all([loadCourses(), loadItems(), loadNotices()]);
  const today = manilaToday();
  const editing = items.find((x) => x.id === edit);

  return (
    <AdminPage
      tab="calendar"
      form={<ItemForm key={editing?.id ?? "new"} courses={courses} today={today} item={editing} />}
      list="Calendar"
      count={items.length}
    >
      {items.map((x) => (
        <AdminRow
          key={x.id}
          course={courses.find((c) => c.id === x.course_id)}
          title={x.title}
          details={[
            KIND[x.kind],
            x.lab_group,
            formatShort(x.on_date),
            x.at_time && formatTime(fromPgTime(x.at_time)),
            x.moved_from_date && `moved from ${formatShort(x.moved_from_date)}`,
            notices.some((n) => n.calendar_item_id === x.id) && "has a notice",
          ].filter(Boolean).join(" · ")}
          past={x.on_date < today}
          editing={x.id === editing?.id}
          actions={<>
            <Link className="btn s" href={`/admin/calendar?edit=${x.id}`}>Edit</Link>
            <ConfirmDelete title={x.title} action={deleteItem.bind(null, x.id)} />
          </>}
        />
      ))}
    </AdminPage>
  );
}
