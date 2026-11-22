import DigestTest from "@/components/DigestTest";
import AdminPage from "@/components/AdminPage";
import AdminRow from "@/components/AdminRow";
import { adminClient } from "@/lib/supabase/admin";

/** Officer tool: see or send this browser's phone the same digest the 9 PM cron delivers. */
export default async function AdminDigest() {
  const { count } = await adminClient().from("push_subscriptions").select("*", { count: "exact", head: true });
  const phones = count ?? 0;
  return (
    <AdminPage
      tab="digest"
      form={<DigestTest />}
      list="Daily digest"
      count={phones}
    >
      <AdminRow
        title="9:00 PM cron"
        details={`${phones} ${phones === 1 ? "phone" : "phones"} subscribed · each gets one summary per day · opens the Schedule for tomorrow`}
        actions={<></>}
      />
    </AdminPage>
  );
}
