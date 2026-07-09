import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const soundLabUrl = new URL("./components/SoundLab.tsx", import.meta.url);
const rewardFeedbackUrl = new URL("./rewardFeedback.ts", import.meta.url);
const stylesUrl = new URL("./styles.css", import.meta.url);

describe("sound lab reward tests", () => {
  it("exposes the requested explosion test buttons", async () => {
    const source = await readFile(soundLabUrl, "utf8");

    assert.match(source, /Test Daily Explosion/);
    assert.match(source, /Test 1\/4 Inertia Explosion/);
    assert.match(source, /Test 4\/4 Weekly Complete Explosion/);
    assert.match(source, /Test 8\/8 Couple Mega Explosion/);
    assert.match(source, /Test Hold Build-Up \+ Rupture/);
    assert.match(source, /Test Screen Shake/);
    assert.match(source, /Test Particle Stress/);
    assert.doesNotMatch(source, /Daily animation test/);
  });

  it("shows uploaded reward asset status and source assignments", async () => {
    const source = await readFile(soundLabUrl, "utf8");
    const rewardSource = await readFile(rewardFeedbackUrl, "utf8");

    assert.match(source, /Resolved reward assets/);
    assert.match(rewardSource, /daily-impact\.mp3/);
    assert.match(rewardSource, /individual-goal\.mp3/);
    assert.match(rewardSource, /couple-goal\.mp3/);
    assert.match(rewardSource, /level-up-track\.mp3/);
    assert.match(rewardSource, /LEVEL_UP_TRACK_SRC/);
    assert.doesNotMatch(source, /Main sound for 4\/4 and 8\/8/);
    assert.match(source, /8-bit fallback/);
    assert.match(source, /disabled/i);
  });

  it("uses the central resolver and checks resolved files as audio", async () => {
    const source = await readFile(soundLabUrl, "utf8");
    const rewardSource = await readFile(rewardFeedbackUrl, "utf8");

    assert.match(source, /Promise\.all/);
    assert.match(source, /resolveFeedbackSoundAsset/);
    assert.match(rewardSource, /headers\.get\("content-type"\)/);
    assert.match(rewardSource, /contentType\.startsWith\("audio\/"\)/);
  });

  it("exposes independent buttons for every requested reward sound", async () => {
    const source = await readFile(soundLabUrl, "utf8");

    assert.match(source, /Play level-up-track\.mp3/);
    assert.match(source, /Play daily workout sound/);
    assert.match(source, /Play 1\/4 inertia broken sound/);
    assert.match(source, /Play 2\/4 momentum sound/);
    assert.match(source, /Play 3\/4 target in range sound/);
    assert.match(source, /Play 4\/4 individual goal sound/);
    assert.match(source, /Play 8\/8 couple goal sound/);
    assert.match(source, /expectedPrimaryFile/);
    assert.match(source, /actual/);
  });

  it("exposes the requested particle, shake, flash, trigger and reduced-motion controls", async () => {
    const source = await readFile(soundLabUrl, "utf8");

    assert.match(source, /HOLD_TO_CONFIRM_MS = 3000/);
    assert.match(source, /Particle intensity/);
    assert.match(source, /Screen shake/);
    assert.match(source, /Flash intensity/);
    assert.match(source, /Show trigger point/);
    assert.match(source, /Reduced motion preview/);
    assert.match(source, /Ridiculous/);
    assert.match(source, /Play level-up-track\.mp3/);
  });

  it("styles the daily reward burst like the other reward states", async () => {
    const source = await readFile(stylesUrl, "utf8");

    assert.match(source, /\.reward-daily \.hold-shockwave/);
    assert.match(source, /\.reward-daily,\s*\n\.reward-first,/);
    assert.match(source, /\.reward-explosion-overlay/);
    assert.match(source, /explosionShakeRidiculous/);
  });
});
