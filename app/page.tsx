import { loadCourses } from "@/lib/data";

export const revalidate = 60;

export default async function Home() {
  const courses = await loadCourses(); // exercises the database path; Task 7 builds the Schedule
  return <main>Class Hub: {courses.length} courses</main>;
}
