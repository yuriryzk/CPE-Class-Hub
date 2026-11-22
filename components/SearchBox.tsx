"use client";
import s from "./SearchBox.module.css";

/** The search box on /search. Escape clears the query and leaves the field. */
export default function SearchBox({ defaultValue }: { defaultValue?: string }) {
  return (
    <input
      className={s.input}
      type="search"
      name="q"
      defaultValue={defaultValue}
      placeholder="Course, notice or file…"
      aria-label="Search courses, notices and files"
      autoComplete="off"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.currentTarget.value = "";
          e.currentTarget.blur();
        }
      }}
    />
  );
}
