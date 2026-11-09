import { loadCourses, loadFiles, LoadError } from "@/lib/data";
import FileTable from "@/components/files/FileTable";
import Tabs, { TabPanel } from "@/components/Tabs";
import { GENERAL } from "@/lib/types";

export const revalidate = 60;

export default async function Files({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const { course } = await searchParams;
  let data;
  try {
    const [courses, files] = await Promise.all([loadCourses(), loadFiles()]);
    data = { courses, files };
  } catch (e) {
    if (!(e instanceof LoadError)) throw e;
    const href = `/files${course ? `?${new URLSearchParams({ course })}` : ""}`;
    return <main><div className="title"><h1>Files</h1></div><p className="box empty">Couldn&apos;t load the {e.what}. <a href={href}>Try again.</a></p></main>;
  }
  const { courses, files } = data;
  const picked = courses.find((c) => c.code.toLowerCase() === course?.toLowerCase());
  const shown = files.filter((f) => (picked ? f.course_id === picked.id : f.course_id === null));
  const counts: Record<string, number> = { general: files.filter((f) => f.course_id === null).length };
  for (const f of files) if (f.course_id) counts[f.course_id] = (counts[f.course_id] ?? 0) + 1;
  const noun = `${shown.length} ${shown.length === 1 ? "file or link" : "files and links"}`;

  return (
    <main>
      <div className="title"><h1>Files</h1></div>
      <Tabs label="Files by course" base="/files" courses={courses} counts={counts} sel={picked?.code ?? "general"} />
      <TabPanel title={picked?.name ?? "General"} count={noun} color={picked?.color ?? GENERAL}>
        {shown.length ? <FileTable files={shown} courses={courses} /> : <p className="empty">No files for {picked?.name ?? "General"} yet.</p>}
      </TabPanel>
    </main>
  );
}
