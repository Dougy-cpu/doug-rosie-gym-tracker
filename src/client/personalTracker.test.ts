import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { TrackerState } from "../shared/types.js";
import { PersonalTracker } from "./components/PersonalTracker.js";

const completeState: TrackerState = {
  viewer: "doug",
  pageUser: null,
  users: [
    { id: 1, slug: "doug", displayName: "Doug", createdAt: "2026-07-06T00:00:00.000Z" },
    { id: 2, slug: "rosie", displayName: "Rosie", createdAt: "2026-07-06T00:00:00.000Z" }
  ],
  today: "2026-07-06",
  week: { start: "2026-07-05", end: "2026-07-11" },
  month: {
    label: "July 2026",
    start: "2026-07-01",
    end: "2026-07-31",
    days: [{ isoDate: "2026-07-06", dayOfMonth: 6, inMonth: true, weekdayIndex: 1 }]
  },
  workoutsByUser: {
    doug: ["2026-07-05", "2026-07-06", "2026-07-08", "2026-07-10"],
    rosie: []
  },
  counts: {
    doug: { week: 4, target: 4 },
    rosie: { week: 0, target: 4 },
    couple: { week: 4, target: 8 }
  },
  pendingAchievements: []
};

describe("PersonalTracker", () => {
  it("shows a visible completed mission badge at 4 out of 4", () => {
    const markup = renderToStaticMarkup(
      React.createElement(PersonalTracker, {
        state: completeState,
        userSlug: "doug",
        muted: false,
        busy: false,
        rewardClass: "reward-none",
        rewardDurationMs: 11102,
        onMuteChange: () => undefined,
        onNavigate: () => undefined,
        onLog: async () => undefined,
        onRemove: async () => undefined,
        onHoldStart: () => undefined,
        onHoldCancel: () => undefined,
        onHoldPressurePulse: () => undefined,
        onRewardOriginChange: () => undefined
      })
    );

    assert.match(markup, /mission-badge/);
    assert.match(markup, /WEEK LOCKED/);
  });

  it("passes the reward sound duration into the hold tile animation", () => {
    const markup = renderToStaticMarkup(
      React.createElement(PersonalTracker, {
        state: completeState,
        userSlug: "doug",
        muted: false,
        busy: false,
        rewardClass: "reward-complete",
        rewardDurationMs: 11102,
        onMuteChange: () => undefined,
        onNavigate: () => undefined,
        onLog: async () => undefined,
        onRemove: async () => undefined,
        onHoldStart: () => undefined,
        onHoldCancel: () => undefined,
        onHoldPressurePulse: () => undefined,
        onRewardOriginChange: () => undefined
      })
    );

    assert.match(markup, /--reward-duration:11102ms/);
  });
});
