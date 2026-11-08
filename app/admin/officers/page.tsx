import { notFound } from "next/navigation";
import { removeOfficer } from "@/app/admin/actions/officers";
import AdminPage from "@/components/AdminPage";
import AdminRow from "@/components/AdminRow";
import { ActionButton } from "@/components/ConfirmDelete";
import OfficerForm from "@/components/forms/OfficerForm";
import { requireOfficer } from "@/lib/auth";
import { serverClient } from "@/lib/supabase/server";

export default async function AdminOfficers() {
  const me = await requireOfficer();
  if (me.role !== "head") notFound(); // officers read only their own row; the list is for the head
  const { data, error } = await (await serverClient()).from("officers").select("email, role, added_by").order("role").order("email");
  if (error) throw error;

  return (
    <AdminPage tab="officers" form={<OfficerForm />} list="Officers" count={data.length}>
      {data.map((o) => (
        <AdminRow
          key={o.email}
          title={o.email}
          details={o.role === "head" ? "Head officer" : `Officer${o.added_by ? ` · added by ${o.added_by}` : ""}`}
          actions={o.email !== me.email.toLowerCase() && (
            <ActionButton label="Remove" action={removeOfficer.bind(null, o.email)} done="Officer removed" ask={`Remove ${o.email}? They can still read the site but can't change it.`} />
          )}
        />
      ))}
    </AdminPage>
  );
}
