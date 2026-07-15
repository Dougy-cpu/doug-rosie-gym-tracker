import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const canvasUrl = new URL("./components/RewardExplosionCanvas.tsx", import.meta.url);

describe("RewardExplosionCanvas", () => {
  it("renders as a fixed full-screen canvas particle system", async () => {
    const source = await readFile(canvasUrl, "utf8");

    assert.match(source, /<canvas ref=\{canvasRef\}/);
    assert.match(source, /requestAnimationFrame/);
    assert.match(source, /cancelAnimationFrame/);
    assert.match(source, /getContext\("2d", \{ alpha: true \}\)/);
    assert.match(source, /globalCompositeOperation = "lighter"/);
  });

  it("includes all required particle and impact types", async () => {
    const source = await readFile(canvasUrl, "utf8");

    assert.match(source, /"spark"/);
    assert.match(source, /"firework"/);
    assert.match(source, /"shard"/);
    assert.match(source, /"ember"/);
    assert.match(source, /"smoke"/);
    assert.match(source, /"rain"/);
    assert.match(source, /shockwaves\.push/);
    assert.match(source, /drawScreenFlashes/);
    assert.match(source, /chromaticOffset/);
  });

  it("uses pooling, visibility pausing and an adaptive frame-time guard", async () => {
    const source = await readFile(canvasUrl, "utf8");

    assert.match(source, /particlePool/);
    assert.match(source, /pool\.pop\(\)/);
    assert.match(source, /pool\.push\(particle\)/);
    assert.match(source, /averageFrameMs > 23/);
    assert.match(source, /adaptiveSpawnScale/);
    assert.match(source, /visibilitychange/);
    assert.match(source, /onMetricsRef/);
  });

  it("supports multiple epicentres and isolates shake from fixed overlays", async () => {
    const source = await readFile(canvasUrl, "utf8");

    assert.match(source, /activeRequest\.origin/);
    assert.match(source, /getRewardEpicentres/);
    assert.match(source, /buildRewardBurstTimeline/);
    assert.match(source, /querySelector\("\.app-surface"\)/);
    assert.match(source, /classList\.add\(shakeClass\)/);
    assert.match(source, /classList\.remove\(shakeClass\)/);
  });
});
