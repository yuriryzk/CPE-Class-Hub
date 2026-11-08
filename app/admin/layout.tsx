import { redirect } from "next/navigation";
import { getOfficer } from "@/lib/auth";
import { serverClient } from "@/lib/supabase/server";
import NotOfficer from "./not-officer";

// Pages are guarded here; writes are guarded by withOfficer and the database.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (await getOfficer()) return children;
  const { data: { user } } = await (await serverClient()).auth.getUser();
  if (!user) redirect("/login");
  return <NotOfficer />;
}
