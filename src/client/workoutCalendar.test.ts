import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { cancelCalendarClickActivation, PersonalCalendar } from "./components/WorkoutCalendar.js";
import type { CalendarDay } from "../shared/date.js";

const days: CalendarDay[] = [
  { isoDate: "2026-07-05", dayOfMonth: 5, inMonth: true, weekdayIndex: 0 },
  { isoDate: "2026-07-06", dayOfMonth: 6, inMonth: true, weekdayIndex: 1 }
];

describe("PersonalCalendar", () => {
  it("renders completed dates through the hold-controlled calendar action", () => {
    const markup = renderToStaticMarkup(
      React.createElement(PersonalCalendar, {
        days,
        today: "2026-07-06",
        userSlug: "rosie",
        workoutsByUser: {
          doug: [],
          rosie: ["2026-07-05"]
        },
        onAdd: () => undefined,
        onRemoveRequest: () => undefined,
        onHoldStart: () => undefined,
        onHoldCancel: () => undefined
      })
    );

    const holdCalendarButtonCount = (markup.match(/hold-calendar-day/g) ?? []).length;

    assert.equal(holdCalendarButtonCount, 2);
    assert.match(markup, /data-calendar-action="remove"/);
  });

  it("cancels normal click activation on hold-controlled calendar dates", () => {
    const source = readFileSync(new URL("./components/WorkoutCalendar.tsx", import.meta.url), "utf8");

    assert.match(source, /event\.preventDefault\(\);\s*event\.stopPropagation\(\);/);
  });

  it("uses click as a final cancellation gate when pointer release is missed", () => {
    let prevented = 0;
    let propagationStopped = 0;
    let holdStopped = 0;

    cancelCalendarClickActivation(
      {
        preventDefault: () => {
          prevented += 1;
        },
        stopPropagation: () => {
          propagationStopped += 1;
        }
      } as Pick<React.MouseEvent<HTMLButtonElement>, "preventDefault" | "stopPropagation">,
      () => {
        holdStopped += 1;
      }
    );

    assert.equal(prevented, 1);
    assert.equal(propagationStopped, 1);
    assert.equal(holdStopped, 1);
  });
});
