import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const distortionUrl = new URL("./components/DistortionShockwave.tsx", import.meta.url);
const progressUrl = new URL("./components/ProgressSegments.tsx", import.meta.url);
const stylesUrl = new URL("./styles.css", import.meta.url);
const appUrl = new URL("./App.tsx", import.meta.url);

describe("ultra mobile reward UI", () => {
  it("uses a dedicated mobile-safe chromatic distortion layer with cleanup", async () => {
    const source = await readFile(distortionUrl, "utf8");

    assert.match(source, /distortion-ring-red/);
    assert.match(source, /distortion-ring-cyan/);
    assert.match(source, /distortion-smear/);
    assert.match(source, /layer\.animate/);
    assert.match(source, /animation\.cancel\(\)/);
    assert.match(source, /top-left/);
    assert.match(source, /bottom-right/);
    assert.doesNotMatch(source, /querySelector<HTMLElement>\("\.app-surface"\)/);
  });

  it("renders progress as numbered lock hardware instead of a plain bar", async () => {
    const source = await readFile(progressUrl, "utf8");
    const styles = await readFile(stylesUrl, "utf8");

    assert.match(source, /LockKeyhole/);
    assert.match(source, /mechanical-locks/);
    assert.match(source, /target-armed/);
    assert.match(styles, /mechanicalLockSlam/);
    assert.match(styles, /mechanicalTargetPulse/);
  });

  it("keeps normal tracker effects off React's telemetry render loop", async () => {
    const source = await readFile(appUrl, "utf8");

    assert.match(source, /route === "sound-lab" \? setEffectMetrics : undefined/);
    assert.match(source, /DistortionShockwave request=\{explosionRequest\}/);
    assert.match(source, /className="app-surface"/);
  });

  it("keeps hold and reward motion inside interaction and viewport layers", async () => {
    const styles = await readFile(stylesUrl, "utf8");

    assert.match(styles, /html\.hold-interaction-active \.app-shell/);
    assert.match(styles, /-webkit-touch-callout: none/);
    assert.match(styles, /\.reward-explosion-canvas\.explosion-shake-ridiculous/);
    assert.doesNotMatch(styles, /\.app-shell\.reward-[^{]+\.app-surface/);
    assert.doesNotMatch(styles, /\.app-shell\.hold-shell-[^{]+\.app-surface/);
  });
});
