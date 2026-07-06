import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getDeterministicQuote, quoteBanks } from "./quotes.js";

describe("quote helpers", () => {
  it("returns stable quotes for the same context and seed", () => {
    const first = getDeterministicQuote("momentum", "doug-2026-07-06");
    const second = getDeterministicQuote("momentum", "doug-2026-07-06");

    assert.equal(first, second);
    assert.equal(quoteBanks.momentum.includes(first), true);
  });

  it("uses different banks for personal and couple completion", () => {
    assert.notDeepEqual(quoteBanks["individual-complete"], quoteBanks["couple-complete"]);
  });
});
