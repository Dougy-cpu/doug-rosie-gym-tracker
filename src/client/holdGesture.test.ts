import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CALENDAR_HOLD_DURATION_MS } from "./components/WorkoutCalendar.js";
import { HOLD_TO_CONFIRM_MS } from "./components/HoldToLogTile.js";
import { createHoldGestureController, getHoldHapticPattern } from "./holdGesture.js";

type FrameCallback = () => void | Promise<void>;

describe("hold gesture controller", () => {
  it("uses the same hold duration for calendar backfill and today's tile", () => {
    assert.equal(CALENDAR_HOLD_DURATION_MS, HOLD_TO_CONFIRM_MS);
  });

  it("uses a 3000ms hold for the pressure-build logging interaction", () => {
    assert.equal(HOLD_TO_CONFIRM_MS, 3000);
  });

  it("does not complete when released before the hold duration", async () => {
    let completed = 0;
    let progress = 0;
    const frameCallbacks: FrameCallback[] = [];
    let now = 0;

    const controller = createHoldGestureController({
      durationMs: 1500,
      getNow: () => now,
      onProgress: (nextProgress) => {
        progress = nextProgress;
      },
      onComplete: async () => {
        completed += 1;
      },
      requestFrame: (callback) => {
        frameCallbacks.push(callback);
        return frameCallbacks.length;
      },
      cancelFrame: (frameId) => {
        frameCallbacks.splice(frameId - 1, 1);
      }
    });

    controller.start();
    now = 120;
    controller.stop();
    const cancelledCallback = frameCallbacks.pop();
    if (cancelledCallback) {
      await cancelledCallback();
    }

    assert.equal(completed, 0);
    assert.equal(progress, 0);
  });

  it("completes once after the hold duration elapses", async () => {
    let completed = 0;
    const progressValues: number[] = [];
    const frameCallbacks: FrameCallback[] = [];
    let now = 0;

    const controller = createHoldGestureController({
      durationMs: 1500,
      getNow: () => now,
      onProgress: (nextProgress) => {
        progressValues.push(nextProgress);
      },
      onComplete: async () => {
        completed += 1;
      },
      requestFrame: (callback) => {
        frameCallbacks.push(callback);
        return frameCallbacks.length;
      },
      cancelFrame: (frameId) => {
        frameCallbacks.splice(frameId - 1, 1);
      }
    });

    controller.start();
    now = 1600;
    const completionCallback = frameCallbacks.pop();
    if (completionCallback) {
      await completionCallback();
    }
    now = 3200;
    const staleCallback = frameCallbacks.pop();
    if (staleCallback) {
      await staleCallback();
    }

    assert.equal(completed, 1);
    assert.deepEqual(progressValues, [1, 0]);
  });

  it("fires the four progressive hold haptic milestones once", async () => {
    const milestones: string[] = [];
    const frameCallbacks: FrameCallback[] = [];
    let now = 0;
    const controller = createHoldGestureController({
      durationMs: 3000,
      getNow: () => now,
      onProgress: () => undefined,
      onMilestone: (milestone) => milestones.push(milestone),
      onComplete: async () => undefined,
      requestFrame: (callback) => {
        frameCallbacks.push(callback);
        return frameCallbacks.length;
      },
      cancelFrame: () => undefined
    });

    controller.start();
    for (const time of [600, 1200, 1800, 2400]) {
      now = time;
      const callback = frameCallbacks.shift();
      if (callback) await callback();
    }

    assert.deepEqual(milestones, ["600ms", "1200ms", "1800ms", "2400ms"]);
    assert.deepEqual(getHoldHapticPattern("2400ms"), [35, 20, 45]);
  });
});
