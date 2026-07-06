import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getProgressTone } from "./progress.js";

describe("progress tone", () => {
  it("maps personal progress counts to the expected quote contexts", () => {
    assert.equal(getProgressTone(0, "personal").quoteContext, "idle");
    assert.equal(getProgressTone(1, "personal").quoteContext, "first-workout");
    assert.equal(getProgressTone(2, "personal").quoteContext, "momentum");
    assert.equal(getProgressTone(3, "personal").quoteContext, "one-more");
    assert.equal(getProgressTone(4, "personal").quoteContext, "individual-complete");
  });

  it("uses the Stage 2 tactical personal state labels", () => {
    assert.equal(getProgressTone(0, "personal").headline, "Mission Open");
    assert.equal(getProgressTone(1, "personal").headline, "Inertia Broken");
    assert.equal(getProgressTone(2, "personal").headline, "Momentum");
    assert.equal(getProgressTone(3, "personal").headline, "Target In Range");
    assert.equal(getProgressTone(4, "personal").headline, "Objective Complete");
  });

  it("caps visual intensity when counts exceed target", () => {
    assert.deepEqual(getProgressTone(9, "couple"), {
      quoteContext: "couple-complete",
      intensity: "complete",
      headline: "Couple Week Complete",
      subcopy: "Household objective complete.",
      accent: "gold"
    });
  });
});
