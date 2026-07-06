import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type React from "react";
import { cancelHoldTileClickActivation } from "./components/HoldToLogTile.js";

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
});
