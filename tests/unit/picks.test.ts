import { describe, expect, it } from "vitest";
import { codesParam, parseGroup, resolvePicks, toggle } from "@/lib/picks";

const courses = [
  { id: "micro", code: "MICROP", slot: 1 },
  { id: "pm", code: "PM", slot: 2 },
  { id: "cns", code: "CNS", slot: 6 },
];

describe("resolvePicks", () => {
  it("link wins over saved, sorted by slot, and asks to save", () => {
    expect(resolvePicks("cns, microp", ["pm"], courses)).toEqual({ ids: ["micro", "cns"], save: true });
  });
  it("ignores unknown codes, empty segments and duplicates", () => {
    expect(resolvePicks("XYZ,cns,,CNS", null, courses)).toEqual({ ids: ["cns"], save: true });
    expect(resolvePicks("XYZ", null, courses)).toEqual({ ids: [], save: true });
  });
  it("falls back to saved ids, sorted, dropping deleted ones", () => {
    expect(resolvePicks(null, ["cns", "micro"], courses)).toEqual({ ids: ["micro", "cns"], save: false });
    expect(resolvePicks(null, ["gone", "pm"], courses)).toEqual({ ids: ["pm"], save: false });
  });
  it("means All when nothing is saved", () => {
    expect(resolvePicks(null, null, courses)).toEqual({ ids: [], save: false });
  });
});

describe("toggle", () => {
  it("adds, removes, collapses to All", () => {
    expect(toggle([], "cns", 9)).toEqual(["cns"]);
    expect(toggle(["cns"], "cns", 9)).toEqual([]);
    expect(toggle(["a", "b", "c", "d", "e", "f", "g", "h"], "i", 9)).toEqual([]);
    expect(toggle(["cns"], "all", 9)).toEqual([]);
  });
});

describe("codesParam", () => {
  it("lists codes, null for All", () => {
    expect(codesParam([], courses)).toBeNull();
    expect(codesParam(["micro", "cns"], courses)).toBe("MICROP,CNS");
  });
});

describe("parseGroup", () => {
  it("accepts only G1/G2", () => {
    expect(parseGroup("g1")).toBe("");
    expect(parseGroup("G1")).toBe("G1");
    expect(parseGroup("G2")).toBe("G2");
    expect(parseGroup(null)).toBe("");
  });
});
