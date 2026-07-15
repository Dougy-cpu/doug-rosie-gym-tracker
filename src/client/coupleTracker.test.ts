import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { TrackerState } from "../shared/types.js";
import { CoupleTracker } from "./components/CoupleTracker.js";

describe("CoupleTracker", () => {
  it("renders a combined household target with side-by-side personal scores", () => {
    const markup = renderToStaticMarkup(
      React.createElement(CoupleTracker, {
        state: sampleState,
        muted: false,
        onMuteChange: () => undefined,
        onNavigate: () => undefined
      })
    );

    assert.match(markup, /HOUSEHOLD TARGET/);
    assert.match(markup, /couple-scoreboard/);
    assert.match(markup, /Doug/);
    assert.match(markup, /Rosie/);
    assert.match(markup, /6/);
    assert.match(markup, /8/);
  });
});

const sampleState: TrackerState = {
  viewer: "couple",
  pageUser: null,
  users: [
    { id: 1, slug: "doug", displayName: "Doug", createdAt: "2026-07-05T00:00:00.000Z" },
    { id: 2, slug: "rosie", displayName: "Rosie", createdAt: "2026-07-05T00:00:00.000Z" }
  ],
  today: "2026-07-09",
  week: { start: "2026-07-05", end: "2026-07-11" },
  month: { label: "July 2026", start: "2026-07-01", end: "2026-07-31", days: [] },
  workoutsByUser: { doug: [], rosie: [] },
  counts: {
    doug: { week: 4, target: 4 },
    rosie: { week: 2, target: 4 },
    couple: { week: 6, target: 8 }
  },
  pendingAchievements: []
};
