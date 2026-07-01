const AMAP_REST_ORIGIN = "https://restapi.amap.com";

type Coordinate = {
  longitude: number;
  latitude: number;
};

type Fetcher = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

type AdapterOptions = {
  key?: string;
  fetcher?: Fetcher;
};

export type NearbyPlace = Coordinate & {
  id: string;
  name: string;
  address: string;
  typecode: string;
  distance: number;
};

export type WalkingRoute = {
  distance: number;
  duration: number;
  path: Array<[number, number]>;
};

export type AMapErrorCode =
  | "INVALID_COORDINATES"
  | "AMAP_KEY_MISSING"
  | "AMAP_UNAVAILABLE";

export class AMapServiceError extends Error {
  constructor(public readonly code: AMapErrorCode) {
    super(code);
    this.name = "AMapServiceError";
  }
}

function assertCoordinate(coordinate: Coordinate) {
  const { longitude, latitude } = coordinate;
  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new AMapServiceError("INVALID_COORDINATES");
  }
}

function requireKey(key?: string) {
  if (!key) {
    throw new AMapServiceError("AMAP_KEY_MISSING");
  }
  return key;
}

function parseLocation(value: unknown): [number, number] | null {
  if (typeof value !== "string") {
    return null;
  }
  const [longitude, latitude] = value.split(",").map(Number);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }
  return [longitude, latitude];
}

function asNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function requestJson(
  url: URL,
  fetcher: Fetcher,
): Promise<Record<string, unknown>> {
  try {
    const response = await fetcher(url);
    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok || payload.status !== "1") {
      throw new AMapServiceError("AMAP_UNAVAILABLE");
    }
    return payload;
  } catch {
    throw new AMapServiceError("AMAP_UNAVAILABLE");
  }
}

export async function searchNearby(
  input: Coordinate & { radius: number },
  options: AdapterOptions,
): Promise<NearbyPlace[]> {
  assertCoordinate(input);
  const key = requireKey(options.key);
  const url = new URL("/v5/place/around", AMAP_REST_ORIGIN);
  url.searchParams.set("key", key);
  url.searchParams.set("location", `${input.longitude},${input.latitude}`);
  url.searchParams.set(
    "radius",
    String(Math.min(3000, Math.max(0, Math.round(input.radius)))),
  );
  url.searchParams.set("page_size", "12");
  url.searchParams.set("sortrule", "distance");
  url.searchParams.set("show_fields", "business");

  const payload = await requestJson(url, options.fetcher ?? fetch);
  const pois = Array.isArray(payload.pois) ? payload.pois : [];

  return pois.flatMap((value) => {
    if (!value || typeof value !== "object") {
      return [];
    }
    const poi = value as Record<string, unknown>;
    const location = parseLocation(poi.location);
    if (
      !location ||
      typeof poi.id !== "string" ||
      typeof poi.name !== "string"
    ) {
      return [];
    }
    return [{
      id: poi.id,
      name: poi.name,
      longitude: location[0],
      latitude: location[1],
      address: typeof poi.address === "string" ? poi.address : "",
      typecode: typeof poi.typecode === "string" ? poi.typecode : "",
      distance: asNumber(poi.distance),
    }];
  });
}

export async function walkingRoute(
  input: { origin: Coordinate; destination: Coordinate },
  options: AdapterOptions,
): Promise<WalkingRoute> {
  assertCoordinate(input.origin);
  assertCoordinate(input.destination);
  const key = requireKey(options.key);
  const url = new URL("/v5/direction/walking", AMAP_REST_ORIGIN);
  url.searchParams.set("key", key);
  url.searchParams.set(
    "origin",
    `${input.origin.longitude},${input.origin.latitude}`,
  );
  url.searchParams.set(
    "destination",
    `${input.destination.longitude},${input.destination.latitude}`,
  );

  const payload = await requestJson(url, options.fetcher ?? fetch);
  const route = payload.route as Record<string, unknown> | undefined;
  const paths = Array.isArray(route?.paths) ? route.paths : [];
  const firstPath = paths[0] as Record<string, unknown> | undefined;
  if (!firstPath) {
    throw new AMapServiceError("AMAP_UNAVAILABLE");
  }

  const cost = firstPath.cost as Record<string, unknown> | undefined;
  const steps = Array.isArray(firstPath.steps) ? firstPath.steps : [];
  const path: Array<[number, number]> = [];
  for (const value of steps) {
    const step = value as Record<string, unknown>;
    if (typeof step.polyline !== "string") {
      continue;
    }
    for (const point of step.polyline.split(";")) {
      const coordinate = parseLocation(point);
      if (
        coordinate &&
        (path.length === 0 ||
          path.at(-1)?.[0] !== coordinate[0] ||
          path.at(-1)?.[1] !== coordinate[1])
      ) {
        path.push(coordinate);
      }
    }
  }

  return {
    distance: asNumber(firstPath.distance),
    duration: asNumber(cost?.duration ?? firstPath.duration),
    path,
  };
}
