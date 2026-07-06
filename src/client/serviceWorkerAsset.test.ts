import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const serviceWorkerUrl = new URL("../../public/sw.js", import.meta.url);

describe("service worker asset policy", () => {
  it("uses a new cache version for the Stage 2 app shell", async () => {
    const source = await readFile(serviceWorkerUrl, "utf8");

    assert.match(source, /doug-rosie-gym-tracker-v2/);
  });

  it("does not pre-cache route HTML that can stale the deployed UI", async () => {
    const source = await readFile(serviceWorkerUrl, "utf8");

    assert.doesNotMatch(source, /APP_SHELL\s*=\s*\[[^\]]*"\/doug"/s);
    assert.doesNotMatch(source, /APP_SHELL\s*=\s*\[[^\]]*"\/rosie"/s);
    assert.doesNotMatch(source, /APP_SHELL\s*=\s*\[[^\]]*"\/couple"/s);
  });
});
