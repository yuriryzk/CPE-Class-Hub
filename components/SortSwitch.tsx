"use client";
import { useRouter } from "next/navigation";
import { SORT_COOKIE, type AdminSort } from "@/lib/sort";

/** Most recent / By course for an admin list. Kept in a cookie so the server sends the list already in order. */
export default function SortSwitch({ list, value }: { list: string; value: AdminSort }) {
  const router = useRouter();
  const pick = (v: AdminSort) => {
    document.cookie = `${SORT_COOKIE(list)}=${v}; path=/admin; max-age=31536000; samesite=lax`;
    router.refresh();
  };
  return (
    <div className="seg" role="group" aria-label="Sort">
      {([["recent", "Most recent"], ["course", "By course"]] as const).map(([v, label]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => pick(v)}>{label}</button>
      ))}
    </div>
  );
}
