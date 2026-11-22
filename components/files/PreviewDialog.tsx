"use client";
import { useEffect, useRef, useState } from "react";
import { previewKind } from "@/lib/filePreview";
import type { FileRow } from "@/lib/types";
import s from "./PreviewDialog.module.css";

/** Thumbnail (images) or a "PDF" chip that opens the preview dialog. Renders nothing for non-previewable files. */
export function PreviewButton({ file, onOpen }: { file: FileRow; onOpen: (f: FileRow) => void }) {
  const [failed, setFailed] = useState(false);
  const kind = previewKind(file);
  if (!kind || !file.url) return null;
  return (
    <button type="button" className={s.pv} onClick={() => onOpen(file)} aria-label={`Preview ${file.title}`}>
      {kind === "image" && !failed ? (
        // A broken image just swaps to the label; the row's Open link still works.
        <img className={s.thumb} src={file.url} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      ) : (
        <span className={s.pvlabel}>{kind === "pdf" ? "PDF" : "Preview"}</span>
      )}
    </button>
  );
}

/**
 * Click-to-enlarge preview on a native <dialog>: Escape and backdrop click close it,
 * the browser handles focus trapping. Images render inline; PDFs go in an iframe
 * (some hosts refuse embedding — the "Open original" link is always there).
 */
export default function PreviewDialog({ file, onClose }: { file: FileRow | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const kind = file ? previewKind(file) : null;
  const [imgFailed, setImgFailed] = useState(false);
  const fileId = file?.id;
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (file && kind && !d.open) {
      d.showModal();
      // Module class names are hashed; the first <button> in the dialog is the close one.
      d.querySelector<HTMLElement>("button")?.focus();
    } else if (!file && d.open) {
      d.close();
    }
  }, [file, kind]);
  useEffect(() => setImgFailed(false), [fileId]);
  return (
    <dialog ref={ref} className={s.dlg} aria-labelledby="pvT" onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current.close()}>
      {file && kind && file.url && (
        <>
          <div className={s.dh}>
            <div>
              <p>{kind === "pdf" ? "PDF document" : "Image"}</p>
              <h2 id="pvT">{file.title}</h2>
            </div>
            <div className={s.acts}>
              <a className={s.open} href={file.url} target="_blank" rel="noopener">Open original ↗</a>
              <button type="button" className={s.x} aria-label="Close preview" onClick={() => ref.current?.close()}>×</button>
            </div>
          </div>
          <div className={s.db}>
            {kind === "image" ? (
              imgFailed ? (
                <p className="empty">Couldn&apos;t load the preview. <a href={file.url} target="_blank" rel="noopener">Open the original</a>.</p>
              ) : (
                <img className={s.pic} src={file.url} alt={file.title} onError={() => setImgFailed(true)} />
              )
            ) : (
              <>
                <iframe className={s.frame} src={file.url} title={file.title} />
                <p className={s.note}>If nothing loads, the host doesn&apos;t allow embedding — use Open original.</p>
              </>
            )}
          </div>
        </>
      )}
    </dialog>
  );
}
