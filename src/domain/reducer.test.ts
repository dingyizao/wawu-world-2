import { describe, expect, expectTypeOf, it } from "vitest";

import type { GameAction } from "./actions";
import { applyGameAction } from "./reducer";
import { createInitialState } from "./state";
import type { GameStateV1, ShardLedgerEntry } from "./types";

function readyState(memoryShards: number): GameStateV1 {
  return {
    ...createInitialState("user-1"),
    wallet: { memoryShards },
  };
}

const claimAction = {
  id: "claim-1",
  type: "CLAIM_WALK_SHARDS",
  createdAt: "2026-06-30T10:00:00.000Z",
  payload: { steps: 5230 },
} as const satisfies GameAction;

describe("memory shard reducer", () => {
  it("limits ledger reasons to current shard operations", () => {
    expectTypeOf<ShardLedgerEntry["reason"]>().toEqualTypeOf<
      "walk" | "agent_action"
    >();
  });

  it("claims walking shards once and records the change", () => {
    const initial = readyState(0);

    const first = applyGameAction(initial, claimAction);
    const second = applyGameAction(first, claimAction);

    expect(first.wallet.memoryShards).toBe(52);
    expect(first.ledger).toEqual([
      {
        id: "claim-1",
        actionId: "claim-1",
        change: 52,
        reason: "walk",
        createdAt: claimAction.createdAt,
      },
    ]);
    expect(first.processedActionIds).toEqual(["claim-1"]);
    expect(first.revision).toBe(1);
    expect(second).toBe(first);
  });

  it("caps walking rewards at 80 shards", () => {
    const result = applyGameAction(readyState(5), {
      ...claimAction,
      id: "claim-capped",
      payload: { steps: 25_000 },
    });

    expect(result.wallet.memoryShards).toBe(85);
    expect(result.ledger[0]?.change).toBe(80);
  });

  it("processes a zero reward without adding a zero-change ledger entry", () => {
    const result = applyGameAction(readyState(0), {
      ...claimAction,
      id: "claim-zero",
      payload: { steps: 99 },
    });

    expect(result.wallet.memoryShards).toBe(0);
    expect(result.ledger).toEqual([]);
    expect(result.processedActionIds).toEqual(["claim-zero"]);
    expect(result.revision).toBe(1);
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid walking steps %s without mutating state",
    (steps) => {
      const initial = readyState(7);
      const snapshot = structuredClone(initial);

      expect(() =>
        applyGameAction(initial, {
          ...claimAction,
          id: "claim-invalid",
          payload: { steps },
        }),
      ).toThrow("INVALID_STEPS");
      expect(initial).toEqual(snapshot);
    },
  );

  it("spends shards and grants one reward with action provenance", () => {
    const initial = readyState(20);
    const action = {
      id: "spend-1",
      type: "COMPLETE_AGENT_ACTION",
      createdAt: "2026-06-30T11:00:00.000Z",
      payload: {
        actionType: "explore",
        shardCost: 10,
        rewardItemId: "old-radio",
      },
    } as const satisfies GameAction;

    const first = applyGameAction(initial, action);
    const second = applyGameAction(first, action);

    expect(first.wallet.memoryShards).toBe(10);
    expect(first.ledger).toEqual([
      {
        id: "spend-1",
        actionId: "spend-1",
        change: -10,
        reason: "agent_action",
        createdAt: action.createdAt,
      },
    ]);
    expect(first.inventory).toEqual([
      {
        id: "inventory:spend-1",
        definitionId: "old-radio",
        sourceActionId: "spend-1",
      },
    ]);
    expect(first.processedActionIds).toEqual(["spend-1"]);
    expect(first.revision).toBe(1);
    expect(second).toBe(first);
  });

  it("creates distinct reward instances for different actions", () => {
    const first = applyGameAction(readyState(20), {
      id: "spend-a",
      type: "COMPLETE_AGENT_ACTION",
      createdAt: "2026-06-30T11:00:00.000Z",
      payload: {
        actionType: "explore",
        shardCost: 1,
        rewardItemId: "old-radio",
      },
    });
    const second = applyGameAction(first, {
      id: "spend-b",
      type: "COMPLETE_AGENT_ACTION",
      createdAt: "2026-06-30T11:01:00.000Z",
      payload: {
        actionType: "learn",
        shardCost: 1,
        rewardItemId: "old-radio",
      },
    });

    expect(second.inventory).toEqual([
      {
        id: "inventory:spend-a",
        definitionId: "old-radio",
        sourceActionId: "spend-a",
      },
      {
        id: "inventory:spend-b",
        definitionId: "old-radio",
        sourceActionId: "spend-b",
      },
    ]);
  });

  it("keeps delimiter-bearing action and reward pairs collision-free", () => {
    const first = applyGameAction(readyState(2), {
      id: "action:a",
      type: "COMPLETE_AGENT_ACTION",
      createdAt: "2026-06-30T11:00:00.000Z",
      payload: {
        actionType: "explore",
        shardCost: 1,
        rewardItemId: "b",
      },
    });
    const second = applyGameAction(first, {
      id: "action",
      type: "COMPLETE_AGENT_ACTION",
      createdAt: "2026-06-30T11:01:00.000Z",
      payload: {
        actionType: "learn",
        shardCost: 1,
        rewardItemId: "a:b",
      },
    });

    expect(second.inventory.map(({ id }) => id)).toEqual([
      "inventory:action:a",
      "inventory:action",
    ]);
    expect(new Set(second.inventory.map(({ id }) => id)).size).toBe(2);
  });

  it("processes a zero-cost reward once without a zero-change ledger entry", () => {
    const action = {
      id: "spend-free",
      type: "COMPLETE_AGENT_ACTION",
      createdAt: "2026-06-30T11:00:00.000Z",
      payload: {
        actionType: "offline-care",
        shardCost: 0,
        rewardItemId: "care-note",
      },
    } as const satisfies GameAction;

    const first = applyGameAction(readyState(0), action);
    const second = applyGameAction(first, action);

    expect(first.wallet.memoryShards).toBe(0);
    expect(first.ledger).toEqual([]);
    expect(first.inventory).toEqual([
      {
        id: "inventory:spend-free",
        definitionId: "care-note",
        sourceActionId: "spend-free",
      },
    ]);
    expect(first.processedActionIds).toEqual(["spend-free"]);
    expect(first.revision).toBe(1);
    expect(second).toBe(first);
  });

  it("does not add an inventory item when no reward is present", () => {
    const result = applyGameAction(readyState(10), {
      id: "spend-no-reward",
      type: "COMPLETE_AGENT_ACTION",
      createdAt: "2026-06-30T11:00:00.000Z",
      payload: {
        actionType: "learn",
        shardCost: 2,
      },
    });

    expect(result.inventory).toEqual([]);
    expect(result.wallet.memoryShards).toBe(8);
  });

  it("rejects an action when shards are insufficient with no partial mutation", () => {
    const initial = readyState(3);
    const snapshot = structuredClone(initial);

    expect(() =>
      applyGameAction(initial, {
        id: "spend-too-much",
        type: "COMPLETE_AGENT_ACTION",
        createdAt: "2026-06-30T11:00:00.000Z",
        payload: {
          actionType: "socialize",
          shardCost: 10,
          rewardItemId: "old-radio",
        },
      }),
    ).toThrow("INSUFFICIENT_MEMORY_SHARDS");
    expect(initial).toEqual(snapshot);
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid shard cost %s without mutating state",
    (shardCost) => {
      const initial = readyState(20);
      const snapshot = structuredClone(initial);

      expect(() =>
        applyGameAction(initial, {
          id: "spend-invalid",
          type: "COMPLETE_AGENT_ACTION",
          createdAt: "2026-06-30T11:00:00.000Z",
          payload: {
            actionType: "create",
            shardCost,
            rewardItemId: "old-radio",
          },
        }),
      ).toThrow("INVALID_SHARD_COST");
      expect(initial).toEqual(snapshot);
    },
  );

  it("returns a new state without mutating the input", () => {
    const initial = readyState(1);
    const snapshot = structuredClone(initial);

    const result = applyGameAction(initial, {
      ...claimAction,
      id: "claim-immutable",
      payload: { steps: 100 },
    });

    expect(result).not.toBe(initial);
    expect(result.wallet).not.toBe(initial.wallet);
    expect(result.ledger).not.toBe(initial.ledger);
    expect(result.processedActionIds).not.toBe(initial.processedActionIds);
    expect(initial).toEqual(snapshot);
  });

  it("spends without mutating or aliasing changed input branches", () => {
    const initial = readyState(10);
    const snapshot = structuredClone(initial);

    const result = applyGameAction(initial, {
      id: "spend-immutable",
      type: "COMPLETE_AGENT_ACTION",
      createdAt: "2026-06-30T11:00:00.000Z",
      payload: {
        actionType: "create",
        shardCost: 3,
        rewardItemId: "sketch",
      },
    });

    expect(result).not.toBe(initial);
    expect(result.wallet).not.toBe(initial.wallet);
    expect(result.ledger).not.toBe(initial.ledger);
    expect(result.inventory).not.toBe(initial.inventory);
    expect(result.processedActionIds).not.toBe(initial.processedActionIds);
    expect(initial).toEqual(snapshot);
  });
});
