import { describe, expect, it } from "vitest";

import { CHENGDU_ANCHORS, checkInAnchor } from "./anchors";

describe("city anchors", () => {
  it("defines ten Chengdu demo anchors", () => {
    expect(CHENGDU_ANCHORS).toHaveLength(10);
    expect(new Set(CHENGDU_ANCHORS.map(({ id }) => id)).size).toBe(10);
  });

  it("requires a real visitor to be within 120 metres", () => {
    expect(() => checkInAnchor({ mode: "real", distance: 121 })).toThrow(
      "TOO_FAR_FROM_ANCHOR",
    );
    expect(checkInAnchor({ mode: "real", distance: 120 }).training).toBe(false);
  });

  it("labels training completion without a real unlock", () => {
    expect(checkInAnchor({ mode: "training" })).toEqual({
      training: true,
      realUnlock: false,
    });
  });
});
