export interface MapPoint {
  longitude: number;
  latitude: number;
}

export interface LocationSample extends MapPoint {
  accuracy: number;
  recordedAt: string;
}

export interface MemoryShardSpawn extends MapPoint {
  id: string;
  amount: number;
  label: string;
  expiresAt?: string;
}

export type PickupDecision =
  | {
      eligible: true;
      reason: "IN_RANGE";
    }
  | {
      eligible: false;
      reason:
        | "TWO_FIXES_REQUIRED"
        | "LOW_ACCURACY"
        | "STALE_FIXES"
        | "OUT_OF_RANGE";
    };

const COMPANION_OFFSET = {
  longitude: 0.00018,
  latitude: 0.00012,
};
const EARTH_RADIUS_METERS = 6_371_000;
const GPS_ACCURACY_LIMIT_METERS = 50;
const PICKUP_RADIUS_METERS = 25;
const SHARD_WINDOW_MS = 10 * 60 * 1000;
const SHARD_GRACE_MS = 2 * 60 * 1000;

function roundCoordinate(value: number) {
  return Math.round(value * 100_000) / 100_000;
}

function hashSeed(seed: string) {
  let hash = 2166136261;
  for (const char of seed) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function nextRandom(value: number) {
  return (Math.imul(value, 1664525) + 1013904223) >>> 0;
}

function radians(value: number) {
  return (value * Math.PI) / 180;
}

export function haversineDistanceMeters(left: MapPoint, right: MapPoint) {
  const latitudeDelta = radians(right.latitude - left.latitude);
  const longitudeDelta = radians(right.longitude - left.longitude);
  const leftLatitude = radians(left.latitude);
  const rightLatitude = radians(right.latitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(leftLatitude) *
      Math.cos(rightLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function countGpsSteps(samples: LocationSample[]) {
  let distanceMeters = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    if (
      previous.accuracy > GPS_ACCURACY_LIMIT_METERS ||
      current.accuracy > GPS_ACCURACY_LIMIT_METERS
    ) {
      continue;
    }
    const elapsedSeconds =
      (Date.parse(current.recordedAt) - Date.parse(previous.recordedAt)) / 1000;
    if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) {
      continue;
    }
    const segmentMeters = haversineDistanceMeters(previous, current);
    const speedMetersPerSecond = segmentMeters / elapsedSeconds;
    if (
      segmentMeters < 2 ||
      segmentMeters > 100 ||
      speedMetersPerSecond > 3.5
    ) {
      continue;
    }
    distanceMeters += segmentMeters;
  }
  return {
    distanceMeters,
    steps: Math.floor(distanceMeters / 0.72),
  };
}

export function pickupDecision(
  samples: LocationSample[],
  shard: MapPoint,
): PickupDecision {
  if (samples.length < 2) {
    return { eligible: false, reason: "TWO_FIXES_REQUIRED" };
  }
  const fixes = samples.slice(-2);
  if (fixes.some(({ accuracy }) => accuracy > GPS_ACCURACY_LIMIT_METERS)) {
    return { eligible: false, reason: "LOW_ACCURACY" };
  }
  const elapsed = Date.parse(fixes[1].recordedAt) - Date.parse(fixes[0].recordedAt);
  if (!Number.isFinite(elapsed) || elapsed <= 0 || elapsed > 30_000) {
    return { eligible: false, reason: "STALE_FIXES" };
  }
  if (
    fixes.some(
      (sample) => haversineDistanceMeters(sample, shard) > PICKUP_RADIUS_METERS,
    )
  ) {
    return { eligible: false, reason: "OUT_OF_RANGE" };
  }
  return { eligible: true, reason: "IN_RANGE" };
}

export function companionPositionFromUser(user: MapPoint): MapPoint {
  return {
    longitude: roundCoordinate(user.longitude + COMPANION_OFFSET.longitude),
    latitude: roundCoordinate(user.latitude + COMPANION_OFFSET.latitude),
  };
}

export function createMemoryShardRefresh({
  center,
  count = 5,
  seed,
}: {
  center: MapPoint;
  count?: number;
  seed: string;
}): MemoryShardSpawn[] {
  let state = hashSeed(seed);
  return Array.from({ length: count }, (_, index) => {
    state = nextRandom(state);
    const angle = (state / 0xffffffff) * Math.PI * 2;
    state = nextRandom(state);
    const distance = 0.00032 + (state / 0xffffffff) * 0.00076;
    state = nextRandom(state);
    const amount = 1 + (state % 3);
    return {
      id: `shard-${seed}-${index}`,
      amount,
      label: `记忆碎片 +${amount}`,
      longitude: roundCoordinate(center.longitude + Math.cos(angle) * distance),
      latitude: roundCoordinate(center.latitude + Math.sin(angle) * distance),
    };
  });
}

function shardCellCenter(position: MapPoint) {
  const latitudeStep = 0.0027;
  const latitude =
    (Math.floor(position.latitude / latitudeStep) + 0.5) * latitudeStep;
  const longitudeStep =
    latitudeStep / Math.max(Math.cos(radians(latitude)), 0.2);
  return {
    latitude,
    longitude:
      (Math.floor(position.longitude / longitudeStep) + 0.5) * longitudeStep,
  };
}

export function createServerShardRefresh({
  userId,
  position,
  at,
}: {
  userId: string;
  position: MapPoint;
  at: Date;
}) {
  const windowStart = Math.floor(at.getTime() / SHARD_WINDOW_MS) * SHARD_WINDOW_MS;
  const refreshAt = new Date(windowStart + SHARD_WINDOW_MS).toISOString();
  const expiresAt = new Date(
    windowStart + SHARD_WINDOW_MS + SHARD_GRACE_MS,
  ).toISOString();
  const center = shardCellCenter(position);
  const seed = `${userId}:${roundCoordinate(center.longitude)}:${roundCoordinate(
    center.latitude,
  )}:${windowStart}`;
  const publicSeed = hashSeed(seed).toString(16);
  return {
    shards: createMemoryShardRefresh({ center, seed }).map((shard) => ({
      ...shard,
      id: `shard-${publicSeed}-${shard.id.slice(shard.id.lastIndexOf("-") + 1)}`,
      expiresAt,
    })),
    refreshAt,
    expiresAt,
  };
}
