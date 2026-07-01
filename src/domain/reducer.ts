import type { GameAction } from "./actions";
import type { GameStateV1, ShardLedgerEntry } from "./types";

function isNonNegativeInteger(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value) && value >= 0;
}

function ledgerEntry(
  action: GameAction,
  change: number,
  reason: "walk" | "agent_action",
): ShardLedgerEntry {
  return {
    id: action.id,
    actionId: action.id,
    change,
    reason,
    createdAt: action.createdAt,
  };
}

export function applyGameAction(
  state: GameStateV1,
  action: GameAction,
): GameStateV1 {
  if (state.processedActionIds.includes(action.id)) {
    return state;
  }

  if (action.type === "START_WALK") {
    if (
      !action.payload.walkId ||
      state.walks.some((walk) => walk.id === action.payload.walkId)
    ) {
      throw new Error("WALK_ALREADY_EXISTS");
    }
    return {
      ...state,
      revision: state.revision + 1,
      walks: [
        ...state.walks,
        {
          id: action.payload.walkId,
          mode: action.payload.mode,
          steps: 0,
          status: "active",
          startedAt: action.createdAt,
        },
      ],
      processedActionIds: [...state.processedActionIds, action.id],
    };
  }

  if (action.type === "FINISH_WALK") {
    const { walkId, steps } = action.payload;
    if (!isNonNegativeInteger(steps)) {
      throw new Error("INVALID_STEPS");
    }
    const walk = state.walks.find((entry) => entry.id === walkId);
    if (!walk || walk.status !== "active") {
      throw new Error("WALK_NOT_ACTIVE");
    }
    const earned = Math.min(Math.floor(steps / 100), 80);
    return {
      ...state,
      revision: state.revision + 1,
      wallet: {
        memoryShards: state.wallet.memoryShards + earned,
      },
      walks: state.walks.map((entry) =>
        entry.id === walkId
          ? {
              ...entry,
              steps,
              status: "complete" as const,
              finishedAt: action.createdAt,
            }
          : entry,
      ),
      ledger:
        earned > 0
          ? [...state.ledger, ledgerEntry(action, earned, "walk")]
          : state.ledger,
      processedActionIds: [...state.processedActionIds, action.id],
    };
  }

  if (action.type === "CLAIM_WALK_SHARDS") {
    const { steps } = action.payload;
    if (!isNonNegativeInteger(steps)) {
      throw new Error("INVALID_STEPS");
    }

    const earned = Math.min(Math.floor(steps / 100), 80);

    return {
      ...state,
      revision: state.revision + 1,
      wallet: {
        memoryShards: state.wallet.memoryShards + earned,
      },
      ledger:
        earned > 0
          ? [...state.ledger, ledgerEntry(action, earned, "walk")]
          : state.ledger,
      processedActionIds: [...state.processedActionIds, action.id],
    };
  }

  const { shardCost, rewardItemId } = action.payload;
  if (!isNonNegativeInteger(shardCost)) {
    throw new Error("INVALID_SHARD_COST");
  }
  if (state.wallet.memoryShards < shardCost) {
    throw new Error("INSUFFICIENT_MEMORY_SHARDS");
  }

  return {
    ...state,
    revision: state.revision + 1,
    wallet: {
      memoryShards: state.wallet.memoryShards - shardCost,
    },
    ledger:
      shardCost > 0
        ? [
            ...state.ledger,
            ledgerEntry(action, -shardCost, "agent_action"),
          ]
        : state.ledger,
    inventory:
      rewardItemId === undefined
        ? state.inventory
        : [
            ...state.inventory,
            {
              id: `inventory:${action.id}`,
              definitionId: rewardItemId,
              sourceActionId: action.id,
            },
          ],
    processedActionIds: [...state.processedActionIds, action.id],
  };
}
