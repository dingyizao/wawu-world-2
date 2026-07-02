import {
  createServerShardRefresh,
  pickupDecision,
  type LocationSample,
} from "../domain/map-interactions";
import type { GameRepository } from "./repository";

function assertFreshLocation(sample: LocationSample, now: Date) {
  const age = now.getTime() - Date.parse(sample.recordedAt);
  if (age > 60_000 || age < -10_000) {
    throw new Error("LOCATION_SAMPLE_STALE");
  }
}

function locationSample(value: unknown): LocationSample | null {
  if (
    !value ||
    typeof value !== "object" ||
    !("longitude" in value) ||
    !("latitude" in value) ||
    !("accuracy" in value) ||
    !("recordedAt" in value) ||
    typeof value.longitude !== "number" ||
    typeof value.latitude !== "number" ||
    typeof value.accuracy !== "number" ||
    typeof value.recordedAt !== "string" ||
    !Number.isFinite(value.longitude) ||
    !Number.isFinite(value.latitude) ||
    !Number.isFinite(value.accuracy) ||
    value.longitude < -180 ||
    value.longitude > 180 ||
    value.latitude < -90 ||
    value.latitude > 90 ||
    value.accuracy < 0 ||
    !Number.isFinite(Date.parse(value.recordedAt))
  ) {
    return null;
  }
  return {
    longitude: value.longitude,
    latitude: value.latitude,
    accuracy: value.accuracy,
    recordedAt: value.recordedAt,
  };
}

export function parseNearbyInput(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Object.keys(value).some((key) => key !== "walkId" && key !== "position") ||
    !("walkId" in value) ||
    typeof value.walkId !== "string" ||
    value.walkId.trim() === "" ||
    !("position" in value)
  ) {
    return null;
  }
  const position = locationSample(value.position);
  return position ? { walkId: value.walkId, position } : null;
}

export function parseClaimInput(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Object.keys(value).some(
      (key) => key !== "walkId" && key !== "shardId" && key !== "samples",
    ) ||
    !("walkId" in value) ||
    typeof value.walkId !== "string" ||
    value.walkId.trim() === "" ||
    !("shardId" in value) ||
    typeof value.shardId !== "string" ||
    value.shardId.trim() === "" ||
    !("samples" in value) ||
    !Array.isArray(value.samples) ||
    value.samples.length !== 2
  ) {
    return null;
  }
  const samples = value.samples.map(locationSample);
  if (samples.some((sample) => sample === null)) {
    return null;
  }
  return {
    walkId: value.walkId,
    shardId: value.shardId,
    samples: samples as LocationSample[],
  };
}

export async function refreshMapShards(
  repository: GameRepository,
  userId: string,
  input: {
    walkId: string;
    position: LocationSample;
  },
  now = new Date(),
) {
  const state = await repository.getState(userId);
  const walk = state?.walks.find(
    ({ id, status }) => id === input.walkId && status === "active",
  );
  if (!walk) {
    throw new Error("WALK_NOT_ACTIVE");
  }
  assertFreshLocation(input.position, now);
  if (input.position.accuracy > 50) {
    throw new Error("LOW_ACCURACY");
  }
  const refresh = createServerShardRefresh({
    userId,
    position: input.position,
    at: now,
  });
  const retained = (state?.activeMapShards ?? []).filter(
    ({ expiresAt, id }) =>
      Date.parse(expiresAt) > now.getTime() &&
      !refresh.shards.some((shard) => shard.id === id),
  );
  const shards = [...retained, ...refresh.shards];
  const result = await repository.applyAction(userId, {
    id: `map-shards:${refresh.shards[0]?.id ?? refresh.refreshAt}`,
    type: "REFRESH_MAP_SHARDS",
    createdAt: now.toISOString(),
    payload: { shards },
  });
  return {
    shards: result.state.activeMapShards ?? shards,
    refreshAt: refresh.refreshAt,
  };
}

export async function claimMapShard(
  repository: GameRepository,
  userId: string,
  input: {
    walkId: string;
    shardId: string;
    samples: LocationSample[];
  },
  now = new Date(),
) {
  const state = await repository.getState(userId);
  if (!state) {
    throw new Error("STATE_NOT_FOUND");
  }
  const actionId = `map-shard:${input.shardId}`;
  if (state.processedActionIds.includes(actionId)) {
    const entry = state.ledger.find(({ actionId: id }) => id === actionId);
    return {
      claimed: true,
      deduped: true,
      amount: entry?.change ?? 0,
      memoryShards: state.wallet.memoryShards,
    };
  }
  const walk = state.walks.find(
    ({ id, status }) => id === input.walkId && status === "active",
  );
  if (!walk) {
    throw new Error("WALK_NOT_ACTIVE");
  }
  input.samples.forEach((sample) => assertFreshLocation(sample, now));
  const shard = state.activeMapShards?.find(({ id }) => id === input.shardId);
  if (!shard) {
    throw new Error("SHARD_NOT_ACTIVE");
  }
  if (Date.parse(shard.expiresAt) <= now.getTime()) {
    throw new Error("SHARD_EXPIRED");
  }
  const decision = pickupDecision(input.samples, shard);
  if (!decision.eligible) {
    throw new Error(decision.reason);
  }
  const result = await repository.applyAction(userId, {
    id: actionId,
    type: "CLAIM_MAP_SHARD",
    createdAt: now.toISOString(),
    payload: {
      shardId: shard.id,
      amount: shard.amount,
    },
  });
  return {
    claimed: true,
    deduped: result.deduped,
    amount: shard.amount,
    memoryShards: result.state.wallet.memoryShards,
  };
}
