import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRewardBurstTimeline,
  defaultRewardExplosionControls,
  getExplosionKindForReward,
  getRewardEpicentres,
  getRewardExplosionProfile,
  resolveRewardEffectDuration,
  rewardEffectConfig,
  type RewardExplosionControls
} from "./rewardExplosion.js";

const normalControls: RewardExplosionControls = {
  ...defaultRewardExplosionControls,
  particleIntensity: "normal"
};

describe("reward explosion profiles", () => {
  it("keeps reward duration, epicentre mode and intensity in one central config", () => {
    assert.equal(rewardEffectConfig.daily.durationMs, 2800);
    assert.equal(rewardEffectConfig.first.durationMs, 3600);
    assert.equal(rewardEffectConfig.weekly.durationMode, "match-audio");
    assert.equal(rewardEffectConfig.weekly.epicentreMode, "multi-stage");
    assert.equal(rewardEffectConfig.couple.durationMode, "match-audio");
    assert.equal(rewardEffectConfig.couple.epicentreMode, "multi-stage-offscreen");
    assert.equal(rewardEffectConfig.couple.defaultIntensity, "ridiculous");
  });

  it("matches long weekly effects to audio and uses the required fallbacks", () => {
    assert.deepEqual(resolveRewardEffectDuration("weekly", 11154, "audio-metadata"), {
      durationMs: 11154,
      durationSource: "audio-metadata"
    });
    assert.deepEqual(resolveRewardEffectDuration("couple", 30067, "configured-audio"), {
      durationMs: 30067,
      durationSource: "configured-audio"
    });
    assert.deepEqual(resolveRewardEffectDuration("weekly", null, "fallback"), {
      durationMs: 6000,
      durationSource: "fallback"
    });
    assert.deepEqual(resolveRewardEffectDuration("couple", null, "fallback"), {
      durationMs: 8000,
      durationSource: "fallback"
    });
  });

  it("supports low through ridiculous quality without changing duration", () => {
    const low = getRewardExplosionProfile("daily", { ...normalControls, particleIntensity: "low" });
    const normal = getRewardExplosionProfile("daily", normalControls);
    const high = getRewardExplosionProfile("daily", { ...normalControls, particleIntensity: "high" });
    const ridiculous = getRewardExplosionProfile("daily", { ...normalControls, particleIntensity: "ridiculous" });

    assert.ok(low.counts.sparks < normal.counts.sparks);
    assert.ok(normal.counts.sparks < high.counts.sparks);
    assert.ok(high.counts.sparks < ridiculous.counts.sparks);
    assert.equal(low.durationMs, ridiculous.durationMs);
    assert.ok(low.activeParticleCap < ridiculous.activeParticleCap);
  });

  it("creates weekly and couple epicentres on-screen and beyond every viewport edge", () => {
    const weekly = getRewardEpicentres("weekly", 400, 800, null);
    const couple = getRewardEpicentres("couple", 400, 800, null);

    assert.ok(weekly.some((point) => point.x < 0));
    assert.ok(weekly.some((point) => point.x > 400));
    assert.ok(couple.some((point) => point.id === "doug-side"));
    assert.ok(couple.some((point) => point.id === "rosie-side"));
    assert.ok(couple.some((point) => point.x < 0));
    assert.ok(couple.some((point) => point.x > 400));
    assert.ok(couple.some((point) => point.y < 0));
    assert.ok(couple.some((point) => point.y > 800));
  });

  it("continues secondary fireworks until the final audio phase", () => {
    const weekly = getRewardExplosionProfile("weekly", normalControls, {
      audioDurationMs: 11154,
      durationSource: "configured-audio"
    });
    const couple = getRewardExplosionProfile("couple", normalControls, {
      audioDurationMs: 30067,
      durationSource: "configured-audio"
    });
    const weeklyTimeline = buildRewardBurstTimeline(weekly, 6);
    const coupleTimeline = buildRewardBurstTimeline(couple, 9);

    assert.ok(weeklyTimeline.some((event) => event.kind === "firework" && event.atMs > weekly.durationMs * 0.7));
    assert.ok(coupleTimeline.some((event) => event.kind === "firework" && event.atMs > couple.durationMs * 0.8));
    assert.equal(weeklyTimeline.at(-1)?.kind, "final");
    assert.equal(coupleTimeline.at(-1)?.kind, "final");
  });

  it("maps every workout milestone to its intended effect", () => {
    assert.equal(getExplosionKindForReward({ countAfter: 1, created: true }), "first");
    assert.equal(getExplosionKindForReward({ countAfter: 2, created: true }), "momentum");
    assert.equal(getExplosionKindForReward({ countAfter: 3, created: true }), "target");
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
