import { describe, expect, it } from "vitest";
import { previewKind } from "@/lib/filePreview";

const file = (url: string | null, mime_type: string | null = null) => ({ url, mime_type });

describe("previewKind", () => {
  it("previews common image extensions", () => {
    for (const ext of ["jpg", "jpeg", "png", "webp", "gif", "avif"]) {
      expect(previewKind(file(`https://x.test/a.${ext}`))).toBe("image");
    }
  });
  it("ignores the query string and case when reading the extension", () => {
    expect(previewKind(file("https://x.test/Slides.PNG?raw=1#top"))).toBe("image");
    expect(previewKind(file("https://x.test/doc.PDF?dl=1"))).toBe("pdf");
  });
  it("uses the stored mime type when there is no usable extension", () => {
    expect(previewKind(file("https://x.test/download?id=5", "image/png"))).toBe("image");
    expect(previewKind(file("https://x.test/dl", "application/pdf"))).toBe("pdf");
  });
  it("lets the mime type win over a misleading extension", () => {
    expect(previewKind(file("https://x.test/a.pdf", "image/webp"))).toBe("image");
  });
  it("does not preview other file types", () => {
    for (const ext of ["docx", "zip", "pptx", "mp4", "txt"]) {
      expect(previewKind(file(`https://x.test/a.${ext}`))).toBeNull();
    }
  });
  it("rejects missing urls and non-http links", () => {
    expect(previewKind(file(null))).toBeNull();
    expect(previewKind(file(""))).toBeNull();
    expect(previewKind(file("mailto:a@b.test/c.pdf"))).toBeNull();
    expect(previewKind(file("/files/a.png"))).toBeNull();
  });
});
