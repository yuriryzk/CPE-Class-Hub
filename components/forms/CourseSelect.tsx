import type { Course } from "@/lib/types";

export default function CourseSelect({ courses, value, onChange, general }: { courses: Course[]; value?: string | null; onChange?: (id: string) => void; general?: boolean }) {
  return (
    <label>Course
      <select name="course_id" defaultValue={value ?? ""} onChange={onChange && ((e) => onChange(e.target.value))}>
        {general && <option value="">General (whole class)</option>}
        {courses.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
      </select>
    </label>
  );
}
