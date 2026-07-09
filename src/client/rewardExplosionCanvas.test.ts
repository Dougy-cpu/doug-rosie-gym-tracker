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
    assert.match(source, /getContext\("2d"\)/);
    assert.match(source, /globalCompositeOperation = "lighter"/);
  });

  it("includes all required particle and impact types", async () => {
    const source = await readFile(canvasUrl, "utf8");

    assert.match(source, /"spark"/);
    assert.match(source, /"firework"/);
    assert.match(source, /"shard"/);
    assert.match(source, /"ember"/);
    assert.match(source, /"smoke"/);
    assert.match(source, /createShockwaves/);
    assert.match(source, /drawScreenFlash/);
  });

  it("supports trigger-point origin and aggressive shell shake cleanup", async () => {
    const source = await readFile(canvasUrl, "utf8");

    assert.match(source, /activeRequest\.origin/);
    assert.match(source, /querySelector\("\.app-shell"\)/);
    assert.match(source, /classList\.add\(shakeClass\)/);
    assert.match(source, /classList\.remove\(shakeClass\)/);
  });
});
