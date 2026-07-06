import { describe, expect, it } from "vitest";
import { getProgressTone } from "./progress.js";

describe("progress tone", () => {
  it("maps personal progress counts to the expected quote contexts", () => {
    expect(getProgressTone(0, "personal").quoteContext).toBe("idle");
    expect(getProgressTone(1, "personal").quoteContext).toBe("first-workout");
    expect(getProgressTone(2, "personal").quoteContext).toBe("momentum");
    expect(getProgressTone(3, "personal").quoteContext).toBe("one-more");
    expect(getProgressTone(4, "personal").quoteContext).toBe("individual-complete");
  });

  it("caps visual intensity when counts exceed target", () => {
    expect(getProgressTone(9, "couple")).toMatchObject({
      quoteContext: "couple-complete",
      intensity: "complete"
    });
  });
});
