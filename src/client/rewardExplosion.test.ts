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
  quality: "normal",
  particleIntensity: "normal",
  shardIntensity: "normal",
  fireworkIntensity: "normal",
  smokeIntensity: "normal",
  shockwaveIntensity: "normal",
  distortionIntensity: "normal"
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
    const low = getRewardExplosionProfile("daily", { ...normalControls, quality: "low", particleIntensity: "low" });
    const normal = getRewardExplosionProfile("daily", normalControls);
    const high = getRewardExplosionProfile("daily", { ...normalControls, quality: "high", particleIntensity: "high" });
    const ridiculous = getRewardExplosionProfile("daily", {
      ...normalControls,
      quality: "ridiculous",
      particleIntensity: "ridiculous"
    });

    assert.ok(low.counts.sparks < normal.counts.sparks);
    assert.ok(normal.counts.sparks < high.counts.sparks);
    assert.ok(high.counts.sparks < ridiculous.counts.sparks);
    assert.equal(low.durationMs, ridiculous.durationMs);
    assert.ok(low.activeParticleCap < ridiculous.activeParticleCap);
  });

  it("creates weekly and couple epicentres on-screen and beyond every viewport edge", () => {
    const first = getRewardEpicentres("first", 400, 800, { x: 200, y: 520 });
    const weekly = getRewardEpicentres("weekly", 400, 800, null);
    const couple = getRewardEpicentres("couple", 400, 800, null);

    assert.ok(first.some((point) => point.id === "top-left-viewport"));
    assert.ok(first.some((point) => point.id === "top-right-viewport"));
    assert.ok(first.some((point) => point.offscreen));
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
    assert.ok(weeklyTimeline.some((event) => event.kind === "rain" && event.atMs > weekly.durationMs * 0.6));
    assert.ok(coupleTimeline.some((event) => event.kind === "rain" && event.atMs > couple.durationMs * 0.75));
    assert.equal(weeklyTimeline.at(-1)?.kind, "final");
    assert.equal(coupleTimeline.at(-1)?.kind, "final");
  });

  it("tunes heavy particle systems independently", () => {
    const noShards = getRewardExplosionProfile("couple", { ...normalControls, shardIntensity: "off" });
    const noSmoke = getRewardExplosionProfile("couple", { ...normalControls, smokeIntensity: "off" });
    const noFireworks = getRewardExplosionProfile("couple", { ...normalControls, fireworkIntensity: "off" });

    assert.equal(noShards.counts.shards, 0);
    assert.equal(noSmoke.counts.smoke, 0);
    assert.equal(noFireworks.counts.fireworks, 0);
  });

  it("keeps high-quality shard budgets inside the requested rupture ranges", () => {
    const highControls: RewardExplosionControls = {
      ...normalControls,
      quality: "high",
      particleIntensity: "high",
      shardIntensity: "high"
    };

    assert.ok(inRange(getRewardExplosionProfile("daily", highControls).counts.shards, 40, 100));
    assert.ok(inRange(getRewardExplosionProfile("first", highControls).counts.shards, 80, 140));
    assert.ok(inRange(getRewardExplosionProfile("weekly", highControls).counts.shards, 150, 250));
    assert.ok(inRange(getRewardExplosionProfile("couple", highControls).counts.shards, 250, 400));
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

function inRange(value: number, minimum: number, maximum: number): boolean {
  return value >= minimum && value <= maximum;
}
