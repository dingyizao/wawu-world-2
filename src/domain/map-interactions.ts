export interface MapPoint {
  longitude: number;
  latitude: number;
}

export interface MemoryShardSpawn extends MapPoint {
  id: string;
  amount: number;
  label: string;
}

const COMPANION_OFFSET = {
  longitude: 0.00018,
  latitude: 0.00012,
};

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
    const distance = 0.00045 + (state / 0xffffffff) * 0.00115;
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
