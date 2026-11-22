import { AdminTabs } from "@/components/AdminPage";
import SyllabusIngest from "@/components/SyllabusIngest";
import { loadCourses } from "@/lib/data";
import { manilaToday } from "@/lib/time";

export default async function AdminIngest() {
  const courses = await loadCourses();
  return (
    <main>
      <div className="title"><h1>Admin</h1></div>
      <AdminTabs tab="ingest" />
      <SyllabusIngest courses={courses} today={manilaToday()} />
    </main>
  );
}
