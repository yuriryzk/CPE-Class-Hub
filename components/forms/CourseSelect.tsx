import type { Course } from "@/lib/types";

export default function CourseSelect({ courses, value, onChange }: { courses: Course[]; value?: string; onChange?: (id: string) => void }) {
  return (
    <label>Course
      <select name="course_id" defaultValue={value} onChange={onChange && ((e) => onChange(e.target.value))}>
        {courses.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
      </select>
    </label>
  );
}
