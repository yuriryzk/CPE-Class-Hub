import { describe, expect, it } from "vitest";
import {
  addDays, formatLong, formatShort, formatTime, formatUS, fromPgTime,
  manilaNowMinutes, manilaToday, parseTime, sundayOf, toPgTime, weekdayOf,
} from "@/lib/time";

describe("time", () => {
  it("parses and formats clock times", () => {
    expect(parseTime("7:30 AM")).toBe(450);
    expect(parseTime("7:30am")).toBe(450);
    expect(parseTime("12:00 PM")).toBe(720);
    expect(parseTime("12:30 AM")).toBe(30);
    expect(parseTime("13:00 PM")).toBeNull();
    expect(parseTime("")).toBeNull();
    expect(formatTime(810)).toBe("1:30 PM");
    expect(formatTime(0)).toBe("12:00 AM");
    expect(fromPgTime("07:30:00")).toBe(450);
    expect(toPgTime(450)).toBe("07:30:00");
  });

  it("works in Asia/Manila", () => {
    expect(manilaToday(new Date("2026-11-07T23:30:00Z"))).toBe("2026-11-08");
    expect(manilaToday(new Date("2026-11-07T15:59:00Z"))).toBe("2026-11-07");
    expect(manilaNowMinutes(new Date("2026-11-07T23:30:00Z"))).toBe(450);
  });

  it("does date maths", () => {
    expect(sundayOf("2026-11-11")).toBe("2026-11-08");
    expect(sundayOf("2026-11-08")).toBe("2026-11-08");
    expect(addDays("2026-11-29", 3)).toBe("2026-12-02");
    expect(weekdayOf("2026-11-08")).toBe(7);
    expect(weekdayOf("2026-11-09")).toBe(1);
  });

  it("formats dates", () => {
    expect(formatUS("2026-11-15")).toBe("November 15, 2026");
    expect(formatLong("2026-11-08")).toBe("Sunday 8 November 2026");
    expect(formatShort("2026-11-11")).toBe("Wed 11 Nov");
  });
});
