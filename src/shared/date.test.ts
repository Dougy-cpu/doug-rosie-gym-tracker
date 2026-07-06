import { describe, expect, it } from "vitest";
import {
  compareIsoDates,
  getLondonTodayIso,
  getMonthGrid,
  getWeekRangeForDate,
  isFutureDate
} from "./date.js";

describe("date helpers", () => {
  it("uses Sunday as the start of the week", () => {
    expect(getWeekRangeForDate("2026-07-06")).toEqual({
      start: "2026-07-05",
      end: "2026-07-11"
    });
  });

  it("creates a complete Sunday-first month grid", () => {
    const grid = getMonthGrid("2026-07-06");

    expect(grid[0]?.isoDate).toBe("2026-06-28");
    expect(grid.at(-1)?.isoDate).toBe("2026-08-01");
    expect(grid).toHaveLength(35);
    expect(grid.filter((day) => day.inMonth)).toHaveLength(31);
  });

  it("compares iso calendar dates without timezone drift", () => {
    expect(compareIsoDates("2026-07-05", "2026-07-06")).toBeLessThan(0);
    expect(compareIsoDates("2026-07-06", "2026-07-06")).toBe(0);
    expect(compareIsoDates("2026-07-07", "2026-07-06")).toBeGreaterThan(0);
  });

  it("identifies future dates against an explicit London today value", () => {
    expect(isFutureDate("2026-07-07", "2026-07-06")).toBe(true);
    expect(isFutureDate("2026-07-06", "2026-07-06")).toBe(false);
    expect(isFutureDate("2026-07-05", "2026-07-06")).toBe(false);
  });

  it("can format the current London date as an ISO calendar date", () => {
    expect(getLondonTodayIso(new Date("2026-07-06T10:15:00Z"))).toBe("2026-07-06");
  });
});
