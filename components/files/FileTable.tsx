"use client";
import { useState } from "react";
import type { Course, FileRow } from "@/lib/types";
import { previewKind } from "@/lib/filePreview";
import PreviewDialog, { PreviewButton } from "./PreviewDialog";
import pvCss from "./PreviewDialog.module.css";
import s from "../notices/NoticeList.module.css";

export default function FileTable({ files, courses }: { files: FileRow[]; courses: Course[] }) {
  const [pvFile, setPvFile] = useState<FileRow | null>(null);
  return (
    <>
      <table className={s.tbl}>
        <thead><tr><th scope="col">What it is</th><th scope="col">Course</th><th scope="col">Type</th><th scope="col">Week</th><th scope="col">Open</th></tr></thead>
        <tbody>
          {files.map((f) => {
            const c = courses.find((c) => c.id === f.course_id);
            return (
              <tr key={f.id} style={{ "--c": c?.color ?? "var(--ink)" } as React.CSSProperties}>
                <td>{f.title}</td><td>{c?.code ?? "General"}</td><td>{f.file_type}</td><td>{f.week_label ?? "—"}</td>
                <td>
                  <span className={pvCss.openCell}>
                    {f.url && previewKind(f) && <PreviewButton file={f} onOpen={setPvFile} />}
                    {f.url ? <a href={f.url} target="_blank" rel="noopener">Open link ↗</a> : "No file attached"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <PreviewDialog file={pvFile} onClose={() => setPvFile(null)} />
    </>
  );
}
