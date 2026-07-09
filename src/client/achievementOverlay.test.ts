import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { AchievementEvent, TrackerState } from "../shared/types.js";
import { AchievementOverlay } from "./components/AchievementOverlay.js";

const sampleState: TrackerState = {
  viewer: "doug",
  pageUser: null,
  users: [
    { id: 1, slug: "doug", displayName: "Doug", createdAt: "2026-07-06T00:00:00.000Z" },
    { id: 2, slug: "rosie", displayName: "Rosie", createdAt: "2026-07-06T00:00:00.000Z" }
  ],
  today: "2026-07-06",
  week: { start: "2026-07-05", end: "2026-07-11" },
  month: { label: "July 2026", start: "2026-07-01", end: "2026-07-31", days: [] },
  workoutsByUser: { doug: [], rosie: [] },
  counts: {
    doug: { week: 4, target: 4 },
    rosie: { week: 4, target: 4 },
    couple: { week: 8, target: 8 }
  },
  pendingAchievements: []
};

const individualAchievement: AchievementEvent = {
  id: 1,
  eventType: "individual_week_complete",
  userId: 1,
  triggeringUserId: 1,
  weekStartDate: "2026-07-05",
  createdAt: "2026-07-06T00:00:00.000Z",
  payload: {}
};

const coupleAchievement: AchievementEvent = {
  id: 2,
  eventType: "couple_week_complete",
  userId: null,
  triggeringUserId: 2,
  weekStartDate: "2026-07-05",
  createdAt: "2026-07-06T00:00:00.000Z",
  payload: {}
};

describe("AchievementOverlay", () => {
  it("uses the exact Stage 2 individual completion copy", () => {
    const markup = renderToStaticMarkup(
      React.createElement(AchievementOverlay, {
        achievement: individualAchievement,
        state: sampleState,
        viewer: "doug",
        onDismiss: () => undefined
      })
    );

    assert.match(markup, /WEEKLY TARGET COMPLETE/);
    assert.match(markup, /4 \/ 4/);
    assert.match(markup, /achievement-badge-unlock/);
    assert.match(markup, /BADGE UNLOCKED/);
    assert.match(markup, /--achievement-duration:11154ms/);
    assert.match(markup, /--achievement-lock-at:8366ms/);
    assert.match(markup, /achievement-stage-glow/);
    assert.doesNotMatch(markup, /particle-field/);
  });

  it("uses the exact couple completion copy and a combined 8 out of 8 slam meter", () => {
    const markup = renderToStaticMarkup(
      React.createElement(AchievementOverlay, {
        achievement: coupleAchievement,
        state: sampleState,
        viewer: "doug",
        onDismiss: () => undefined
      })
    );

    assert.match(markup, /COUPLE WEEK COMPLETE/);
    assert.match(markup, /HOUSEHOLD OBJECTIVE COMPLETE/);
    assert.match(markup, /8 \/ 8/);
    assert.match(markup, /achievement-slam-meter/);
    assert.match(markup, /--achievement-duration:30067ms/);
    assert.match(markup, /--achievement-final-at:27060ms/);
    assert.match(markup, /CHARGING/);
    assert.doesNotMatch(markup, /particle-field/);
  });
});
