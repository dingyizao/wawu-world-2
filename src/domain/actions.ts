import type { ActiveMapShard } from "./types";

export type GameAction =
  | {
      id: string;
      type: "START_WALK";
      createdAt: string;
      payload: {
        walkId: string;
        mode: "real" | "training";
      };
    }
  | {
      id: string;
      type: "FINISH_WALK";
      createdAt: string;
      payload: {
        walkId: string;
        steps: number;
        stepSource?: "motion" | "gps-estimate" | "training";
        distanceMeters?: number;
      };
    }
  | {
      id: string;
      type: "CLAIM_WALK_SHARDS";
      createdAt: string;
      payload: {
        steps: number;
      };
    }
  | {
      id: string;
      type: "REFRESH_MAP_SHARDS";
      createdAt: string;
      payload: {
        shards: ActiveMapShard[];
      };
    }
  | {
      id: string;
      type: "CLAIM_MAP_SHARD";
      createdAt: string;
      payload: {
        shardId: string;
        amount: number;
      };
    }
  | {
      id: string;
      type: "COMPLETE_AGENT_ACTION";
      createdAt: string;
      payload: {
        actionType:
          | "explore"
          | "learn"
          | "socialize"
          | "create"
          | "offline-care";
        shardCost: number;
        rewardItemId?: string;
      };
    };
