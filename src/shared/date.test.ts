import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compareIsoDates,
  getLondonTodayIso,
  getMonthGrid,
  getWeekRangeForDate,
  isFutureDate
} from "./date.js";

describe("date helpers", () => {
  it("uses Sunday as the start of the week", () => {
    assert.deepEqual(getWeekRangeForDate("2026-07-06"), {
      start: "2026-07-05",
      end: "2026-07-11"
    });
  });

  it("creates a complete Sunday-first month grid", () => {
    const grid = getMonthGrid("2026-07-06");

    assert.equal(grid[0]?.isoDate, "2026-06-28");
    assert.equal(grid.at(-1)?.isoDate, "2026-08-01");
    assert.equal(grid.length, 35);
    assert.equal(grid.filter((day) => day.inMonth).length, 31);
  });

  it("compares iso calendar dates without timezone drift", () => {
    assert.equal(compareIsoDates("2026-07-05", "2026-07-06") < 0, true);
    assert.equal(compareIsoDates("2026-07-06", "2026-07-06"), 0);
    assert.equal(compareIsoDates("2026-07-07", "2026-07-06") > 0, true);
  });

  it("identifies future dates against an explicit London today value", () => {
    assert.equal(isFutureDate("2026-07-07", "2026-07-06"), true);
    assert.equal(isFutureDate("2026-07-06", "2026-07-06"), false);
    assert.equal(isFutureDate("2026-07-05", "2026-07-06"), false);
  });

  it("can format the current London date as an ISO calendar date", () => {
    assert.equal(getLondonTodayIso(new Date("2026-07-06T10:15:00Z")), "2026-07-06");
  });
});
