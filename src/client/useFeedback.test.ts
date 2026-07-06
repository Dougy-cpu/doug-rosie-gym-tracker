import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createAudioContextSafely, resumeAudioContextSafely } from "./useFeedback.js";

describe("feedback audio resilience", () => {
  it("treats failed audio context creation as unavailable", () => {
    const AudioContextConstructor = class {
      constructor() {
        throw new Error("audio denied");
      }
    } as unknown as typeof AudioContext;

    assert.equal(createAudioContextSafely(AudioContextConstructor), null);
  });

  it("treats failed audio resume as unavailable instead of throwing", async () => {
    const context = {
      state: "suspended",
      resume: async () => {
        throw new Error("audio blocked");
      }
    } as unknown as AudioContext;

    await assert.doesNotReject(() => resumeAudioContextSafely(context));
    assert.equal(await resumeAudioContextSafely(context), false);
  });
});
