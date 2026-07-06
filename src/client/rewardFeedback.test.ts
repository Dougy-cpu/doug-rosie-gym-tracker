import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAchievementFeedback, getWorkoutFeedback } from "./rewardFeedback.js";

describe("reward feedback catalog", () => {
  it("uses progressive sound and haptic patterns for workout milestones", () => {
    assert.deepEqual(getWorkoutFeedback({ countAfter: 1, created: true }), {
      sound: "first",
      haptic: [30, 30, 70],
      rewardClass: "reward-first"
    });
    assert.deepEqual(getWorkoutFeedback({ countAfter: 2, created: true }), {
      sound: "momentum",
      haptic: [20, 30, 40],
      rewardClass: "reward-momentum"
    });
    assert.deepEqual(getWorkoutFeedback({ countAfter: 3, created: true }), {
      sound: "one-more",
      haptic: [20, 20, 30, 20, 60],
      rewardClass: "reward-pressure"
    });
    assert.deepEqual(getWorkoutFeedback({ countAfter: 4, created: true }), {
      sound: "weekly-complete",
      haptic: [40, 40, 80, 40, 120],
      rewardClass: "reward-complete"
    });
  });

  it("falls back to tap feedback when a workout was already logged", () => {
    assert.deepEqual(getWorkoutFeedback({ countAfter: 4, created: false }), {
      sound: "tap",
      haptic: 20,
      rewardClass: "reward-none"
    });
  });

  it("uses the largest feedback pattern for couple completion", () => {
    assert.deepEqual(getAchievementFeedback("couple_week_complete"), {
      sound: "couple-complete",
      haptic: [40, 30, 80, 40, 120, 60, 180]
    });
  });
});
