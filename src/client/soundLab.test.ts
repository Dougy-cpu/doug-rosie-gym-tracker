import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const soundLabUrl = new URL("./components/SoundLab.tsx", import.meta.url);
const rewardFeedbackUrl = new URL("./rewardFeedback.ts", import.meta.url);
const stylesUrl = new URL("./styles.css", import.meta.url);

describe("sound lab reward tests", () => {
  it("wires the daily animation test to the daily cue", async () => {
    const source = await readFile(soundLabUrl, "utf8");

    assert.match(source, /Daily animation test[\s\S]*triggerReward\("reward-daily", "daily", \[35, 20, 60\]\)/);
  });

  it("shows uploaded reward asset status and source assignments", async () => {
    const source = await readFile(soundLabUrl, "utf8");
    const rewardSource = await readFile(rewardFeedbackUrl, "utf8");

    assert.match(source, /Uploaded reward assets/);
    assert.match(rewardSource, /battlefield_6_sting\.mp3/);
    assert.match(rewardSource, /warzone-level-up\.mp3/);
    assert.match(rewardSource, /untitled_nscJ47E\.mp3/);
    assert.match(rewardSource, /at_dooms_2016_gate\.mp3/);
    assert.match(source, /8-bit fallback/);
    assert.match(source, /disabled/i);
  });

  it("only treats uploaded reward assets as loaded when the response is audio", async () => {
    const source = await readFile(soundLabUrl, "utf8");

    assert.match(source, /Promise\.all/);
    assert.match(source, /headers\.get\("content-type"\)/);
    assert.match(source, /contentType\.startsWith\("audio\/"\)/);
  });

  it("exposes the requested hold and reward previews", async () => {
    const source = await readFile(soundLabUrl, "utf8");

    assert.match(source, /HOLD_TO_CONFIRM_MS = 3000/);
    assert.match(source, /Preview full hold sequence/);
    assert.match(source, /Preview cancelled hold at 25%/);
    assert.match(source, /Preview cancelled hold at 60%/);
    assert.match(source, /Preview daily rupture/);
    assert.match(source, /Preview 1\/4 inertia rupture/);
    assert.match(source, /Preview 4\/4 weekly complete/);
    assert.match(source, /Preview 8\/8 couple complete/);
    assert.match(source, /Play weekly track/);
  });

  it("styles the daily reward burst like the other reward states", async () => {
    const source = await readFile(stylesUrl, "utf8");

    assert.match(source, /\.reward-daily \.hold-shockwave/);
    assert.match(source, /\.reward-daily,\s*\n\.reward-first,/);
  });
});
