import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { AchievementEvent, TrackerState } from "../shared/types.js";
import { CoupleClaimCard } from "./components/CoupleClaimCard.js";
import {
  coupleClaimBodies,
  coupleClaimButtons,
  coupleClaimTitles,
  getCoupleClaimCopy,
  getPriorityCoupleClaim,
  sortTriggeredAchievements
} from "./coupleClaim.js";

const individual = makeAchievement(10, "individual_week_complete", 1);
const couple = makeAchievement(20, "couple_week_complete", 2);

describe("couple achievement claim flow", () => {
  it("prioritises the unseen couple reward over other pending achievements", () => {
    assert.equal(getPriorityCoupleClaim([individual, couple])?.id, 20);
  });

  it("keeps the triggering viewer sequence individual first, couple second", () => {
    assert.deepEqual(sortTriggeredAchievements([couple, individual]).map((event) => event.eventType), [
      "individual_week_complete",
      "couple_week_complete"
    ]);
  });

  it("rotates the full requested copy bank deterministically", () => {
    assert.equal(coupleClaimTitles.length, 7);
    assert.equal(coupleClaimBodies.length, 10);
    assert.equal(coupleClaimButtons.length, 8);
    assert.deepEqual(getCoupleClaimCopy(couple, "doug"), getCoupleClaimCopy(couple, "doug"));
  });

  it("renders a user-initiated claim button before the dashboard reward can play", () => {
    const copy = getCoupleClaimCopy(couple, "doug");
    const markup = renderToStaticMarkup(
      React.createElement(CoupleClaimCard, {
        achievement: couple,
        state: sampleState,
        viewer: "doug",
        claiming: false,
        onClaim: () => undefined
      })
    );

    assert.match(markup, /this landed while you were away/i);
    assert.match(markup, /8 \/ 8/);
    assert.match(markup, new RegExp(escapeRegExp(copy.title)));
    assert.match(markup, new RegExp(escapeRegExp(copy.body)));
    assert.match(markup, new RegExp(escapeRegExp(copy.button)));
    assert.match(markup, /reward-crate/);
    assert.match(markup, /REWARD CRATE/);
  });
});

function makeAchievement(
  id: number,
  eventType: AchievementEvent["eventType"],
  triggeringUserId: number
): AchievementEvent {
  return {
    id,
    eventType,
    userId: eventType === "individual_week_complete" ? triggeringUserId : null,
    triggeringUserId,
    weekStartDate: "2026-07-05",
    createdAt: `2026-07-0${eventType === "individual_week_complete" ? 5 : 6}T12:00:00.000Z`,
    payload: {}
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const sampleState: TrackerState = {
  viewer: "doug",
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
    rosie: { week: 4, target: 4 },
    couple: { week: 8, target: 8 }
  },
  pendingAchievements: [couple]
};
