import Link from "next/link";
import { deleteSlot } from "@/app/admin/actions/slots";
import AdminPage from "@/components/AdminPage";
import AdminRow from "@/components/AdminRow";
import ConfirmDelete from "@/components/ConfirmDelete";
import SlotForm from "@/components/forms/SlotForm";
import { loadCourses, loadSlots } from "@/lib/data";
import { formatTime, fromPgTime, WEEKDAYS } from "@/lib/time";
import s from "@/components/Admin.module.css";

const t = (pg: string) => formatTime(fromPgTime(pg));

export default async function AdminClasses({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const [courses, slots] = await Promise.all([loadCourses(), loadSlots()]);
  const editing = slots.find((x) => x.id === edit);

  return (
    <AdminPage tab="classes" form={<SlotForm key={editing?.id ?? "new"} courses={courses} slot={editing} />} list="Weekly classes" count={slots.length}>
      {WEEKDAYS.map((day, i) => {
        const here = slots.filter((x) => x.weekday === i + 1);
        return here.length > 0 && (
          <div key={day}>
            <div className={s.dayhd}>{day}</div>
            {here.map((x) => {
              const course = courses.find((c) => c.id === x.course_id);
              return (
                <AdminRow
                  key={x.id}
                  course={course}
                  title={`${t(x.starts_at)} to ${t(x.ends_at)}`}
                  details={[course?.name, x.lab_group, x.room].filter(Boolean).join(" · ")}
                  editing={x.id === editing?.id}
                  actions={<>
                    <Link className="btn s" href={`/admin/classes?edit=${x.id}`}>Edit</Link>
                    <ConfirmDelete title={`${course?.code ?? "class"} on ${day}`} action={deleteSlot.bind(null, x.id)} />
                  </>}
                />
              );
            })}
          </div>
        );
      })}
    </AdminPage>
  );
}
