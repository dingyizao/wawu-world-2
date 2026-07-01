import { describe, expect, it } from "vitest";

import { getMbtiProfile } from "./mbti";
import { finishWalk, observeWalk, startWalk } from "./walk";

const route = [
  { longitude: 104.06, latitude: 30.66, recordedAt: "2026-07-01T01:00:00Z" },
  { longitude: 104.061, latitude: 30.661, recordedAt: "2026-07-01T01:01:00Z" },
  { longitude: 104.062, latitude: 30.662, recordedAt: "2026-07-01T01:02:00Z" },
  { longitude: 104.063, latitude: 30.663, recordedAt: "2026-07-01T01:03:00Z" },
  { longitude: 104.064, latitude: 30.664, recordedAt: "2026-07-01T01:04:00Z" },
];

describe("walk coordinator", () => {
  it("requires location consent for a real walk", () => {
    expect(() =>
      startWalk({
        id: "walk-real",
        mode: "real",
        locationConsent: false,
        startedAt: "2026-07-01T01:00:00Z",
      }),
    ).toThrow("LOCATION_CONSENT_REQUIRED");
  });

  it("keeps training walks distinct from real check-ins", () => {
    const session = startWalk({
      id: "walk-training",
      mode: "training",
      locationConsent: false,
      startedAt: "2026-07-01T01:00:00Z",
    });

    expect(session.canCreateRealCheckIn).toBe(false);
    expect(session).not.toHaveProperty("companionCoordinate");
  });

  it("uses MBTI preferences when ranking observations", () => {
    const session = startWalk({
      id: "walk-1",
      mode: "training",
      locationConsent: false,
      startedAt: "2026-07-01T01:00:00Z",
    });
    const candidates = [
      { id: "park", name: "公园", tags: ["nature"], distance: 300 },
      { id: "museum", name: "博物馆", tags: ["history"], distance: 120 },
    ];

    expect(
      observeWalk({
        session,
        profile: getMbtiProfile("ENFP"),
        candidates,
      }).rankedAnchors[0]?.id,
    ).toBe("park");
    expect(
      observeWalk({
        session,
        profile: getMbtiProfile("ISTJ"),
        candidates,
      }).rankedAnchors[0]?.id,
    ).toBe("museum");
  });

  it("blurs the first and final route segments in the recap", () => {
    const session = startWalk({
      id: "walk-2",
      mode: "real",
      locationConsent: true,
      startedAt: "2026-07-01T01:00:00Z",
    });
    const recap = finishWalk({
      session,
      steps: 1260,
      finishedAt: "2026-07-01T01:20:00Z",
      route,
    });

    expect(recap.route).toEqual(route.slice(1, -1));
    expect(recap.route).not.toContain(route[0]);
    expect(recap.route).not.toContain(route.at(-1));
  });
});
