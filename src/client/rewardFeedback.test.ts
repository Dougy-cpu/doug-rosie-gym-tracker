import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAchievementFeedback, getWorkoutFeedback } from "./rewardFeedback.js";

describe("reward feedback catalog", () => {
  it("uses progressive sound and haptic patterns for workout milestones", () => {
    assert.deepEqual(getWorkoutFeedback({ countAfter: 1, created: true }), {
      sound: "first",
      haptic: [30, 30, 70],
      rewardClass: "reward-first",
      durationMs: 3004
    });
    assert.deepEqual(getWorkoutFeedback({ countAfter: 2, created: true }), {
      sound: "momentum",
      haptic: [20, 30, 40],
      rewardClass: "reward-momentum",
      durationMs: 3111
    });
    assert.deepEqual(getWorkoutFeedback({ countAfter: 3, created: true }), {
      sound: "one-more",
      haptic: [20, 20, 30, 20, 60],
      rewardClass: "reward-pressure",
      durationMs: 6200
    });
    assert.deepEqual(getWorkoutFeedback({ countAfter: 4, created: true }), {
      sound: "weekly-complete",
      haptic: [40, 40, 80, 40, 120],
      rewardClass: "reward-complete",
      durationMs: 6362
    });
  });

  it("uses the dedicated backfill sound for non-milestone calendar sessions", () => {
    assert.deepEqual(getWorkoutFeedback({ countAfter: 0, created: true, source: "backfill" }), {
      sound: "backfill",
      haptic: [20, 30, 40],
      rewardClass: "reward-daily",
      durationMs: 2916
    });
  });

  it("falls back to tap feedback when a workout was already logged", () => {
    assert.deepEqual(getWorkoutFeedback({ countAfter: 4, created: false }), {
      sound: "tap",
      haptic: 20,
      rewardClass: "reward-none",
      durationMs: 120
    });
  });

  it("uses the largest feedback pattern for couple completion", () => {
    assert.deepEqual(getAchievementFeedback("couple_week_complete"), {
      sound: "couple-complete",
      haptic: [40, 30, 80, 40, 120, 60, 180],
      durationMs: 30000
    });
  });

  it("uses the long individual completion cue for the weekly target overlay", () => {
    assert.deepEqual(getAchievementFeedback("individual_week_complete"), {
      sound: "individual-complete",
      haptic: [40, 40, 80, 40, 120],
      durationMs: 11102
    });
  });
});
