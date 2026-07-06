import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const soundLabUrl = new URL("./components/SoundLab.tsx", import.meta.url);
const stylesUrl = new URL("./styles.css", import.meta.url);

describe("sound lab reward tests", () => {
  it("wires the daily animation test to the daily cue", async () => {
    const source = await readFile(soundLabUrl, "utf8");

    assert.match(source, /Daily animation test[\s\S]*triggerReward\("reward-daily", "daily", \[20, 30, 40\]\)/);
  });

  it("styles the daily reward burst like the other reward states", async () => {
    const source = await readFile(stylesUrl, "utf8");

    assert.match(source, /\.reward-daily \.hold-shockwave/);
    assert.match(source, /\.reward-daily,\s*\n\.reward-first,/);
  });
});
