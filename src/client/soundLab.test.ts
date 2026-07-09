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

    assert.match(source, /Uploaded reward assets/);
    assert.match(rewardSource, /battlefield_6_sting\.mp3/);
    assert.match(rewardSource, /level-up-track\.mp3/);
    assert.match(rewardSource, /LEVEL_UP_TRACK_SRC/);
    assert.match(source, /Main sound for 4\/4 and 8\/8/);
    assert.match(source, /8-bit fallback/);
    assert.match(source, /disabled/i);
  });

  it("only treats uploaded reward assets as loaded when the response is audio", async () => {
    const source = await readFile(soundLabUrl, "utf8");

    assert.match(source, /Promise\.all/);
    assert.match(source, /headers\.get\("content-type"\)/);
    assert.match(source, /contentType\.startsWith\("audio\/"\)/);
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
    assert.match(source, /Play weekly track/);
  });

  it("styles the daily reward burst like the other reward states", async () => {
    const source = await readFile(stylesUrl, "utf8");

    assert.match(source, /\.reward-daily \.hold-shockwave/);
    assert.match(source, /\.reward-daily,\s*\n\.reward-first,/);
    assert.match(source, /\.reward-explosion-overlay/);
    assert.match(source, /explosionShakeRidiculous/);
  });
});
