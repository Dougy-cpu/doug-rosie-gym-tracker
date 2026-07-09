import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultRewardExplosionControls, getExplosionKindForReward, getRewardExplosionProfile } from "./rewardExplosion.js";

describe("reward explosion profiles", () => {
  it("uses over-the-top default particle counts within the requested ranges", () => {
    assert.deepEqual(getRewardExplosionProfile("daily").counts, {
      sparks: 160,
      shards: 52,
      embers: 52,
      smoke: 26,
      shockwaves: 3,
      fireworks: 3
    });
    assert.deepEqual(getRewardExplosionProfile("first").counts, {
      sparks: 240,
      shards: 85,
      embers: 76,
      smoke: 38,
      shockwaves: 3,
      fireworks: 4
    });
    assert.deepEqual(getRewardExplosionProfile("weekly").counts, {
      sparks: 520,
      shards: 210,
      embers: 190,
      smoke: 78,
      shockwaves: 6,
      fireworks: 8
    });
    assert.deepEqual(getRewardExplosionProfile("couple").counts, {
      sparks: 860,
      shards: 340,
      embers: 290,
      smoke: 118,
      shockwaves: 9,
      fireworks: 12
    });
  });

  it("keeps reward durations in the requested visual ranges", () => {
    assert.ok(isBetween(getRewardExplosionProfile("daily").durationMs, 2200, 3200));
    assert.ok(isBetween(getRewardExplosionProfile("weekly").durationMs, 4000, 6000));
    assert.ok(isBetween(getRewardExplosionProfile("couple").durationMs, 5000, 8000));
  });

  it("supports high and ridiculous particle intensity without changing the base profile", () => {
    const high = getRewardExplosionProfile("daily", { ...defaultRewardExplosionControls, particleIntensity: "high" });
    const ridiculous = getRewardExplosionProfile("daily", { ...defaultRewardExplosionControls, particleIntensity: "ridiculous" });

    assert.ok(high.counts.sparks > getRewardExplosionProfile("daily").counts.sparks);
    assert.ok(ridiculous.counts.sparks > high.counts.sparks);
  });

  it("keeps reduced motion visual but much lighter", () => {
    const reduced = getRewardExplosionProfile("couple", { ...defaultRewardExplosionControls, reducedMotionPreview: true });

    assert.ok(reduced.counts.sparks > 0);
    assert.ok(reduced.counts.sparks < getRewardExplosionProfile("couple").counts.sparks);
    assert.equal(reduced.shakeMs, 0);
  });

  it("maps workout and achievement rewards to explosion intensity", () => {
    assert.equal(getExplosionKindForReward({ countAfter: 1, created: true }), "first");
    assert.equal(getExplosionKindForReward({ countAfter: 2, created: true }), "daily");
    assert.equal(getExplosionKindForReward({ countAfter: 4, created: true }), "weekly");
    assert.equal(
      getExplosionKindForReward({
        countAfter: 4,
        created: true,
        achievement: {
          id: 1,
          eventType: "couple_week_complete",
          userId: null,
          triggeringUserId: 1,
          weekStartDate: "2026-07-05",
          createdAt: "2026-07-05T00:00:00.000Z",
          payload: {}
        }
      }),
      "couple"
    );
  });
});

function isBetween(value: number, minimum: number, maximum: number): boolean {
  return value >= minimum && value <= maximum;
}
