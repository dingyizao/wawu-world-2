import { describe, expect, it } from "vitest";

import {
  companionPositionFromUser,
  createMemoryShardRefresh,
} from "./map-interactions";

describe("live map interactions", () => {
  it("keeps the companion beside the user's live GPS position", () => {
    const user = { longitude: 104.0668, latitude: 30.5728 };

    expect(companionPositionFromUser(user)).toEqual({
      longitude: 104.06698,
      latitude: 30.57292,
    });
  });

  it("refreshes collectible memory shards around the current map center", () => {
    const center = { longitude: 104.0668, latitude: 30.5728 };
    const first = createMemoryShardRefresh({ center, seed: "first" });
    const second = createMemoryShardRefresh({ center, seed: "second" });

    expect(first).toHaveLength(5);
    expect(new Set(first.map(({ id }) => id)).size).toBe(5);
    expect(first.every((shard) => shard.amount >= 1 && shard.amount <= 3)).toBe(true);
    expect(first.every((shard) => Math.abs(shard.longitude - center.longitude) < 0.002)).toBe(true);
    expect(first.every((shard) => Math.abs(shard.latitude - center.latitude) < 0.002)).toBe(true);
    expect(first.map(({ id }) => id)).not.toEqual(second.map(({ id }) => id));
  });
});
