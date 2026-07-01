import type { MbtiProfile, WalkMode } from "./types";

export type RoutePoint = {
  longitude: number;
  latitude: number;
  recordedAt: string;
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
