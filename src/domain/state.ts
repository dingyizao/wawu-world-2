import type { GameStateV1 } from "./types";

export function createInitialState(userId: string): GameStateV1 {
  return {
    schemaVersion: 1,
    revision: 0,
    user: { id: userId },
    onboarding: { stage: "meet" },
    agent: null,
    wallet: { memoryShards: 0 },
    walks: [],
    anchors: [],
    ledger: [],
    inventory: [],
    reports: [],
    processedActionIds: [],
  };
}
