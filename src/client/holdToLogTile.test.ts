import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import type React from "react";
import { cancelHoldTileClickActivation } from "./components/HoldToLogTile.js";

const holdTileUrl = new URL("./components/HoldToLogTile.tsx", import.meta.url);
const holdGestureUrl = new URL("./holdGesture.ts", import.meta.url);
const crackOverlayUrl = new URL("./components/CrackOverlay.tsx", import.meta.url);
const shatterBurstUrl = new URL("./components/ShatterBurst.tsx", import.meta.url);

describe("HoldToLogTile", () => {
  it("uses click as a final cancellation gate when pointer release is missed", () => {
    let prevented = 0;
    let propagationStopped = 0;
    let holdStopped = 0;

    cancelHoldTileClickActivation(
      {
        preventDefault: () => {
          prevented += 1;
        },
        stopPropagation: () => {
          propagationStopped += 1;
        }
      } as Pick<React.MouseEvent<HTMLButtonElement>, "preventDefault" | "stopPropagation">,
      () => {
        holdStopped += 1;
      }
    );

    assert.equal(prevented, 1);
    assert.equal(propagationStopped, 1);
    assert.equal(holdStopped, 1);
  });

  it("defines the hold timing once as HOLD_TO_CONFIRM_MS", async () => {
    const source = await readFile(holdTileUrl, "utf8");
    const gestureSource = await readFile(holdGestureUrl, "utf8");

    assert.match(gestureSource, /export const HOLD_TO_CONFIRM_MS = 3000/);
    assert.doesNotMatch(source, /HOLD_TO_LOG_DURATION_MS/);
    assert.doesNotMatch(source, /const HOLD_TO_CONFIRM_MS = 3000/);
    assert.match(source, /durationMs: HOLD_TO_CONFIRM_MS/);
  });

  it("contains the required pressure-build stage labels", async () => {
    const source = await readFile(holdTileUrl, "utf8");

    assert.match(source, /initial-lock/);
    assert.match(source, /pressure-build/);
    assert.match(source, /cracking/);
    assert.match(source, /unstable/);
    assert.match(source, /final-warning/);
    assert.match(source, /Pressure building/);
    assert.match(source, /Do not let go/);
    assert.match(source, /Rupture imminent/);
  });

  it("renders crack and shatter layers for the pressure hold", async () => {
    const source = await readFile(holdTileUrl, "utf8");
    const crackSource = await readFile(crackOverlayUrl, "utf8");
    const shatterSource = await readFile(shatterBurstUrl, "utf8");

    assert.match(source, /CrackOverlay/);
    assert.match(source, /ShatterBurst/);
    assert.match(crackSource, /hold-crack-overlay/);
    assert.match(crackSource, /pathLength="1"/);
    assert.match(crackSource, /crack-intersections/);
    assert.match(shatterSource, /hold-shatter-burst/);
    assert.match(shatterSource, /surfaceFragments/);
  });

  it("moves frame-by-frame progress into CSS variables instead of React state", async () => {
    const source = await readFile(holdTileUrl, "utf8");

    assert.match(source, /style\.setProperty\("--hold-progress-ratio"/);
    assert.doesNotMatch(source, /setProgress\(/);
  });

  it("captures the tile center as the reward explosion origin", async () => {
    const source = await readFile(holdTileUrl, "utf8");

    assert.match(source, /getOriginFromElement\(event\.currentTarget\)/);
    assert.match(source, /onRewardOriginChange/);
  });
});
