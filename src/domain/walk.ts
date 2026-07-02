import { countGpsSteps } from "./map-interactions";
import type {
  MbtiProfile,
  StepSummary,
  WalkMode,
} from "./types";

export type RoutePoint = {
  longitude: number;
  latitude: number;
  recordedAt: string;
  accuracy?: number;
};

export type WalkSessionRuntime = {
  id: string;
  mode: WalkMode;
  startedAt: string;
  canCreateRealCheckIn: boolean;
};

export type WalkAnchorCandidate = {
  id: string;
  name: string;
  tags: string[];
  distance: number;
};

export function startWalk(input: {
  id: string;
  mode: WalkMode;
  locationConsent: boolean;
  startedAt: string;
}): WalkSessionRuntime {
  if (input.mode === "real" && !input.locationConsent) {
    throw new Error("LOCATION_CONSENT_REQUIRED");
  }
  return {
    id: input.id,
    mode: input.mode,
    startedAt: input.startedAt,
    canCreateRealCheckIn: input.mode === "real",
  };
}

export function observeWalk(input: {
  session: WalkSessionRuntime;
  profile: MbtiProfile;
  candidates: WalkAnchorCandidate[];
}) {
  const preferences = new Set(input.profile.poiBias);
  const rankedAnchors = [...input.candidates].sort((left, right) => {
    const leftMatches = left.tags.filter((tag) => preferences.has(tag)).length;
    const rightMatches = right.tags.filter((tag) => preferences.has(tag)).length;
    return rightMatches - leftMatches || left.distance - right.distance;
  });
  return { rankedAnchors };
}

export function finishWalk(input: {
  session: WalkSessionRuntime;
  steps: number;
  finishedAt: string;
  route: RoutePoint[];
}) {
  if (
    !Number.isInteger(input.steps) ||
    input.steps < 0 ||
    !Number.isFinite(input.steps)
  ) {
    throw new Error("INVALID_STEPS");
  }
  return {
    id: input.session.id,
    mode: input.session.mode,
    startedAt: input.session.startedAt,
    finishedAt: input.finishedAt,
    steps: input.steps,
    training: input.session.mode === "training",
    route: input.route.length > 2 ? input.route.slice(1, -1) : [],
  };
}

export function verifyWalkSteps(input: {
  mode: WalkMode;
  startedAt: string;
  finishedAt: string;
  summary: StepSummary;
  route: RoutePoint[];
}) {
  if (
    (input.mode === "training" && input.summary.source !== "training") ||
    (input.mode === "real" && input.summary.source === "training")
  ) {
    throw new Error("INVALID_STEP_SOURCE");
  }
  const durationMs = Math.max(
    0,
    Date.parse(input.finishedAt) - Date.parse(input.startedAt),
  );
  const cadenceCap = Math.floor((durationMs / 1000) * 3.5);
  if (input.mode === "training") {
    return {
      source: "training" as const,
      steps: Math.min(Math.max(0, Math.floor(input.summary.sensorSteps)), cadenceCap),
      distanceMeters: 0,
    };
  }
  const gps = countGpsSteps(
    input.route.map((point) => ({
      longitude: point.longitude,
      latitude: point.latitude,
      accuracy: point.accuracy ?? 50,
      recordedAt: point.recordedAt,
    })),
  );
  if (input.summary.source === "gps-estimate") {
    return {
      source: "gps-estimate" as const,
      steps: Math.min(gps.steps, cadenceCap),
      distanceMeters: gps.distanceMeters,
    };
  }
  return {
    source: "motion" as const,
    steps: Math.min(
      Math.max(0, Math.floor(input.summary.sensorSteps)),
      cadenceCap,
    ),
    distanceMeters: gps.distanceMeters,
  };
}
