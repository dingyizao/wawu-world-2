export type GameAction =
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
