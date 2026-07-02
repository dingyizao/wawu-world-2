import { describe, expect, it } from "vitest";

import { applyGameAction } from "../domain/reducer";
import { createInitialState } from "../domain/state";
import type { GameStateV1 } from "../domain/types";
import { MemoryGameRepository } from "./repository";
import {
  claimMapShard,
  parseClaimInput,
  parseNearbyInput,
  refreshMapShards,
} from "./map-shards";

function walkingState(mode: "real" | "training" = "real"): GameStateV1 {
  const initial = createInitialState("user-1");
  return applyGameAction(initial, {
    id: "start:walk-1",
    type: "START_WALK",
    createdAt: "2026-07-03T01:00:00.000Z",
    payload: { walkId: "walk-1", mode },
  });
}

const sample = {
  longitude: 104.0668,
  latitude: 30.5728,
  accuracy: 10,
  recordedAt: "2026-07-03T01:00:01.000Z",
};

describe("server-owned map shards", () => {
  it("accepts location samples but rejects client-supplied reward amounts", () => {
    expect(parseNearbyInput({ walkId: "walk-1", position: sample })).toEqual({
      walkId: "walk-1",
      position: sample,
    });
    expect(
      parseClaimInput({
        walkId: "walk-1",
        shardId: "shard-1",
        samples: [
          sample,
          { ...sample, recordedAt: "2026-07-03T01:00:09.000Z" },
        ],
      }),
    ).not.toBeNull();
    expect(
      parseClaimInput({
        walkId: "walk-1",
        shardId: "shard-1",
        amount: 5,
        samples: [
          sample,
          { ...sample, recordedAt: "2026-07-03T01:00:09.000Z" },
        ],
      }),
    ).toBeNull();
  });

  it("refreshes shards only for an active walk", async () => {
    const repository = new MemoryGameRepository();
    await repository.saveInitialState("user-1", createInitialState("user-1"));

    await expect(
      refreshMapShards(
        repository,
        "user-1",
        { walkId: "walk-1", position: sample },
        new Date("2026-07-03T01:00:02.000Z"),
      ),
    ).rejects.toThrow("WALK_NOT_ACTIVE");
  });

  it("claims the server reward after two accurate in-range fixes", async () => {
    const repository = new MemoryGameRepository();
    await repository.saveInitialState("user-1", walkingState());
    const refreshed = await refreshMapShards(
      repository,
      "user-1",
      { walkId: "walk-1", position: sample },
      new Date("2026-07-03T01:00:02.000Z"),
    );
    const shard = refreshed.shards[0];
    const fixes = [
      {
        ...sample,
        longitude: shard.longitude,
        latitude: shard.latitude,
      },
      {
        ...sample,
        longitude: shard.longitude,
        latitude: shard.latitude,
        recordedAt: "2026-07-03T01:00:09.000Z",
      },
    ];

    const result = await claimMapShard(
      repository,
      "user-1",
      { walkId: "walk-1", shardId: shard.id, samples: fixes },
      new Date("2026-07-03T01:00:10.000Z"),
    );
    const duplicate = await claimMapShard(
      repository,
      "user-1",
      { walkId: "walk-1", shardId: shard.id, samples: fixes },
      new Date("2026-07-03T01:00:11.000Z"),
    );

    expect(result.amount).toBe(shard.amount);
    expect(result.memoryShards).toBe(shard.amount);
    expect(duplicate.deduped).toBe(true);
    expect(duplicate.memoryShards).toBe(shard.amount);
  });

  it("rejects a claim with one fix, poor accuracy, or an expired shard", async () => {
    const repository = new MemoryGameRepository();
    await repository.saveInitialState("user-1", walkingState());
    const refreshed = await refreshMapShards(
      repository,
      "user-1",
      { walkId: "walk-1", position: sample },
      new Date("2026-07-03T01:00:02.000Z"),
    );
    const shard = refreshed.shards[0];

    await expect(
      claimMapShard(
        repository,
        "user-1",
        { walkId: "walk-1", shardId: shard.id, samples: [sample] },
        new Date("2026-07-03T01:00:10.000Z"),
      ),
    ).rejects.toThrow("TWO_FIXES_REQUIRED");
    await expect(
      claimMapShard(
        repository,
        "user-1",
        {
          walkId: "walk-1",
          shardId: shard.id,
          samples: [
            { ...sample, accuracy: 80 },
            {
              ...sample,
              accuracy: 80,
              recordedAt: "2026-07-03T01:00:09.000Z",
            },
          ],
        },
        new Date("2026-07-03T01:00:10.000Z"),
      ),
    ).rejects.toThrow("LOW_ACCURACY");
    await expect(
      claimMapShard(
        repository,
        "user-1",
        {
          walkId: "walk-1",
          shardId: shard.id,
          samples: [
            {
              ...sample,
              longitude: shard.longitude,
              latitude: shard.latitude,
              recordedAt: "2026-07-03T01:12:50.000Z",
            },
            {
              ...sample,
              longitude: shard.longitude,
              latitude: shard.latitude,
              recordedAt: "2026-07-03T01:12:58.000Z",
            },
          ],
        },
        new Date("2026-07-03T01:13:00.000Z"),
      ),
    ).rejects.toThrow("SHARD_EXPIRED");
  });

  it("rejects stale client location samples", async () => {
    const repository = new MemoryGameRepository();
    await repository.saveInitialState("user-1", walkingState());
    const refreshed = await refreshMapShards(
      repository,
      "user-1",
      { walkId: "walk-1", position: sample },
      new Date("2026-07-03T01:00:02.000Z"),
    );
    const shard = refreshed.shards[0];

    await expect(
      claimMapShard(
        repository,
        "user-1",
        {
          walkId: "walk-1",
          shardId: shard.id,
          samples: [
            { ...sample, longitude: shard.longitude, latitude: shard.latitude },
            {
              ...sample,
              longitude: shard.longitude,
              latitude: shard.latitude,
              recordedAt: "2026-07-03T01:00:09.000Z",
            },
          ],
        },
        new Date("2026-07-03T01:05:00.000Z"),
      ),
    ).rejects.toThrow("LOCATION_SAMPLE_STALE");
  });

  it("keeps the previous shard window claimable during the two-minute grace", async () => {
    const repository = new MemoryGameRepository();
    await repository.saveInitialState("user-1", walkingState());
    const first = await refreshMapShards(
      repository,
      "user-1",
      {
        walkId: "walk-1",
        position: {
          ...sample,
          recordedAt: "2026-07-03T01:09:58.000Z",
        },
      },
      new Date("2026-07-03T01:09:59.000Z"),
    );
    const oldShard = first.shards[0];
    const second = await refreshMapShards(
      repository,
      "user-1",
      {
        walkId: "walk-1",
        position: {
          ...sample,
          recordedAt: "2026-07-03T01:10:00.000Z",
        },
      },
      new Date("2026-07-03T01:10:01.000Z"),
    );

    expect(second.shards.some(({ id }) => id === oldShard.id)).toBe(true);
  });
});
