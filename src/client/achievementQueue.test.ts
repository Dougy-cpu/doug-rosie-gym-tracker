import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AchievementEvent } from "../shared/types.js";
import { mergeAchievementQueue } from "./achievementQueue.js";

const individualAchievement = makeAchievement(10, "individual_week_complete");
const coupleAchievement = makeAchievement(20, "couple_week_complete");

describe("achievement queue", () => {
  it("does not re-enqueue the achievement currently displayed", () => {
    const nextQueue = mergeAchievementQueue([], [individualAchievement], individualAchievement);

    assert.deepEqual(nextQueue.map((event) => event.id), []);
  });

  it("deduplicates repeated pending achievements in the same refresh payload", () => {
    const nextQueue = mergeAchievementQueue([], [coupleAchievement, coupleAchievement], null);

    assert.deepEqual(nextQueue.map((event) => event.id), [20]);
  });
});

function makeAchievement(id: number, eventType: AchievementEvent["eventType"]): AchievementEvent {
  return {
    id,
    eventType,
    userId: eventType === "individual_week_complete" ? 1 : null,
    triggeringUserId: 1,
    weekStartDate: "2026-07-05",
    createdAt: "2026-07-06T00:00:00.000Z",
    payload: {}
  };
}
