import type { Course } from "@/lib/types";

export default function CourseSelect({ courses, value }: { courses: Course[]; value?: string }) {
  return (
    <label>Course
      <select name="course_id" defaultValue={value}>
        {courses.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
      </select>
    </label>
  );
}
