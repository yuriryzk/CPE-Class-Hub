import type { FileRow } from "./types";

export type PreviewKind = "image" | "pdf";

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;
const PDF_EXT = /\.pdf$/i;

/**
 * Can this file be previewed in the lightbox? Files are stored as plain links
 * (`url`); the stored mime type wins when present, else the URL's extension decides.
 * Only http(s) links can be embedded, anything else (mailto:, relative paths…) is out.
 */
export function previewKind(f: Pick<FileRow, "url" | "mime_type">): PreviewKind | null {
  const url = f.url;
  if (!url || !/^https?:\/\//i.test(url)) return null;
  const mime = f.mime_type?.toLowerCase() ?? "";
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  const path = url.split(/[?#]/)[0];
  if (IMAGE_EXT.test(path)) return "image";
  if (PDF_EXT.test(path)) return "pdf";
  return null;
}
