import { describe, expect, it } from "vitest";
import { getDeterministicQuote, quoteBanks } from "./quotes.js";

describe("quote helpers", () => {
  it("returns stable quotes for the same context and seed", () => {
    const first = getDeterministicQuote("momentum", "doug-2026-07-06");
    const second = getDeterministicQuote("momentum", "doug-2026-07-06");

    expect(first).toBe(second);
    expect(quoteBanks.momentum).toContain(first);
  });

  it("uses different banks for personal and couple completion", () => {
    expect(quoteBanks["individual-complete"]).not.toEqual(quoteBanks["couple-complete"]);
  });
});
