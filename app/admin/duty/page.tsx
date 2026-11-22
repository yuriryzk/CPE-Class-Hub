import Link from "next/link";
import { deleteDuty } from "@/app/admin/actions/duty";
import AdminPage from "@/components/AdminPage";
import AdminRow from "@/components/AdminRow";
import ConfirmDelete from "@/components/ConfirmDelete";
import DutyForm from "@/components/forms/DutyForm";
import { loadDuty } from "@/lib/data";
import { formatShort } from "@/lib/time";
import type { DutyAssignment } from "@/lib/types";

const scope = (d: DutyAssignment) => d.week_label ?? (d.on_date ? formatShort(d.on_date) : "Ongoing");

export default async function AdminDuty({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const duties = await loadDuty();
  const editing = duties.find((d) => d.id === edit);

  return (
    <AdminPage tab="duty" form={<DutyForm key={editing?.id ?? "new"} duty={editing} />} list="Duty roster" count={duties.length}>
      {duties.map((d) => (
        <AdminRow
          key={d.id}
          title={d.duty}
          details={`${d.assignee_email} · ${scope(d)}${d.notes ? ` · ${d.notes}` : ""}`}
          editing={d.id === editing?.id}
          actions={<>
            <Link className="btn s" href={`/admin/duty?edit=${d.id}`}>Edit</Link>
            <ConfirmDelete title={d.duty} action={deleteDuty.bind(null, d.id)} />
          </>}
        />
      ))}
    </AdminPage>
  );
}
