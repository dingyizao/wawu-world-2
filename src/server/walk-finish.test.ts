import { describe, expect, it } from "vitest";

import { parseWalkFinishInput } from "./walk-finish";

describe("walk finish input", () => {
  it("accepts a step summary and rejects the legacy client steps field", () => {
    const input = {
      sessionId: "walk-1",
      stepSummary: {
        source: "motion",
        sensorSteps: 120,
        durationMs: 60_000,
      },
      route: [
        {
          longitude: 104.0668,
          latitude: 30.5728,
          accuracy: 12,
          recordedAt: "2026-07-03T01:00:00.000Z",
        },
      ],
    };

    expect(parseWalkFinishInput(input)).toEqual(input);
    expect(parseWalkFinishInput({ ...input, steps: 9_999 })).toBeNull();
  });
});
