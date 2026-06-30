import { describe, expect, it } from "vitest";

import { createInitialState } from "./state";

describe("initial state", () => {
  it("starts at schema version one for the supplied user", () => {
    const state = createInitialState("user-1");

    expect(state.schemaVersion).toBe(1);
    expect(state.revision).toBe(0);
    expect(state.user).toEqual({ id: "user-1" });
  });

  it("starts behind onboarding with an unconfigured agent", () => {
    const state = createInitialState("user-1");

    expect(state.onboarding.stage).toBe("meet");
    expect(state.agent).toBeNull();
  });

  it("uses memory shards as the only balance", () => {
    const state = createInitialState("user-1");

    expect(state.wallet).toEqual({ memoryShards: 0 });
    expect(Object.keys(state.wallet)).toEqual(["memoryShards"]);
  });

  it("starts every collection empty", () => {
    const state = createInitialState("user-1");

    expect(state.walks).toEqual([]);
    expect(state.anchors).toEqual([]);
    expect(state.ledger).toEqual([]);
    expect(state.inventory).toEqual([]);
    expect(state.reports).toEqual([]);
    expect(state.processedActionIds).toEqual([]);
  });

  it("contains only the version one state fields", () => {
    expect(Object.keys(createInitialState("user-1")).sort()).toEqual([
      "schemaVersion",
      "revision",
      "user",
      "onboarding",
      "agent",
      "wallet",
      "walks",
      "anchors",
      "ledger",
      "inventory",
      "reports",
      "processedActionIds",
    ].sort());
  });
});
