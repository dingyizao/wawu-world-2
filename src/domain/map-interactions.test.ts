import { describe, expect, it } from "vitest";

import {
  companionPositionFromUser,
  countGpsSteps,
  createMemoryShardRefresh,
  createServerShardRefresh,
  haversineDistanceMeters,
  pickupDecision,
  type LocationSample,
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

  it("measures short walking distances in meters", () => {
    expect(
      haversineDistanceMeters(
        { longitude: 104.0668, latitude: 30.5728 },
        { longitude: 104.0668, latitude: 30.57289 },
      ),
    ).toBeCloseTo(10, 0);
  });

  it("counts GPS fallback steps while rejecting drift and implausible jumps", () => {
    const samples: LocationSample[] = [
      {
        longitude: 104.0668,
        latitude: 30.5728,
        accuracy: 12,
        recordedAt: "2026-07-03T01:00:00.000Z",
      },
      {
        longitude: 104.066805,
        latitude: 30.572805,
        accuracy: 12,
        recordedAt: "2026-07-03T01:00:05.000Z",
      },
      {
        longitude: 104.0668,
        latitude: 30.57289,
        accuracy: 10,
        recordedAt: "2026-07-03T01:00:10.000Z",
      },
      {
        longitude: 104.0768,
        latitude: 30.58289,
        accuracy: 10,
        recordedAt: "2026-07-03T01:00:11.000Z",
      },
    ];

    const result = countGpsSteps(samples);

    expect(result.distanceMeters).toBeCloseTo(9.5, 0);
    expect(result.steps).toBe(13);
  });

  it("requires two accurate fixes inside 25 meters for automatic pickup", () => {
    const shard = {
      id: "shard-near",
      label: "记忆碎片 +2",
      amount: 2,
      longitude: 104.0668,
      latitude: 30.5728,
    };
    const near = {
      longitude: 104.0668,
      latitude: 30.5729,
      accuracy: 15,
      recordedAt: "2026-07-03T01:00:00.000Z",
    };

    expect(pickupDecision([near], shard)).toEqual({
      eligible: false,
      reason: "TWO_FIXES_REQUIRED",
    });
    expect(
      pickupDecision(
        [
          near,
          {
            ...near,
            recordedAt: "2026-07-03T01:00:08.000Z",
          },
        ],
        shard,
      ),
    ).toEqual({ eligible: true, reason: "IN_RANGE" });
    expect(
      pickupDecision(
        [
          near,
          {
            ...near,
            accuracy: 80,
            recordedAt: "2026-07-03T01:00:08.000Z",
          },
        ],
        shard,
      ),
    ).toEqual({ eligible: false, reason: "LOW_ACCURACY" });
  });

  it("generates a stable server-owned shard set for one area and time window", () => {
    const first = createServerShardRefresh({
      userId: "user-1",
      position: { longitude: 104.0668, latitude: 30.5728 },
      at: new Date("2026-07-03T01:04:00.000Z"),
    });
    const second = createServerShardRefresh({
      userId: "user-1",
      position: { longitude: 104.06682, latitude: 30.57282 },
      at: new Date("2026-07-03T01:09:59.000Z"),
    });
    const nextWindow = createServerShardRefresh({
      userId: "user-1",
      position: { longitude: 104.0668, latitude: 30.5728 },
      at: new Date("2026-07-03T01:10:00.000Z"),
    });

    expect(first.shards).toHaveLength(5);
    expect(second.shards).toEqual(first.shards);
    expect(first.refreshAt).toBe("2026-07-03T01:10:00.000Z");
    expect(first.expiresAt).toBe("2026-07-03T01:12:00.000Z");
    expect(nextWindow.shards.map(({ id }) => id)).not.toEqual(
      first.shards.map(({ id }) => id),
    );
  });
});
