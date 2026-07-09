import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import type React from "react";
import { cancelHoldTileClickActivation } from "./components/HoldToLogTile.js";

const holdTileUrl = new URL("./components/HoldToLogTile.tsx", import.meta.url);

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

    assert.match(source, /export const HOLD_TO_CONFIRM_MS = 3000/);
    assert.doesNotMatch(source, /HOLD_TO_LOG_DURATION_MS/);
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

    assert.match(source, /CrackOverlay/);
    assert.match(source, /ShatterBurst/);
    assert.match(source, /hold-crack-overlay/);
    assert.match(source, /hold-shatter-burst/);
  });
});
