import { describe, expect, it } from "vitest";

import { getMbtiProfile } from "./mbti";
import {
  finishWalk,
  observeWalk,
  startWalk,
  verifyWalkSteps,
} from "./walk";

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

  it("derives GPS fallback steps from the filtered route", () => {
    const result = verifyWalkSteps({
      mode: "real",
      startedAt: "2026-07-03T01:00:00.000Z",
      finishedAt: "2026-07-03T01:00:20.000Z",
      summary: {
        source: "gps-estimate",
        sensorSteps: 9_999,
        durationMs: 20_000,
      },
      route: [
        {
          longitude: 104.0668,
          latitude: 30.5728,
          accuracy: 10,
          recordedAt: "2026-07-03T01:00:00.000Z",
        },
        {
          longitude: 104.0668,
          latitude: 30.57289,
          accuracy: 10,
          recordedAt: "2026-07-03T01:00:10.000Z",
        },
      ],
    });

    expect(result.source).toBe("gps-estimate");
    expect(result.steps).toBe(13);
    expect(result.distanceMeters).toBeCloseTo(10, 0);
  });

  it("caps motion steps at a plausible foreground cadence", () => {
    expect(
      verifyWalkSteps({
        mode: "real",
        startedAt: "2026-07-03T01:00:00.000Z",
        finishedAt: "2026-07-03T01:00:10.000Z",
        summary: {
          source: "motion",
          sensorSteps: 100,
          durationMs: 10_000,
        },
        route: [],
      }).steps,
    ).toBe(35);
  });

  it("keeps training and real step sources separated", () => {
    expect(() =>
      verifyWalkSteps({
        mode: "real",
        startedAt: "2026-07-03T01:00:00.000Z",
        finishedAt: "2026-07-03T01:00:10.000Z",
        summary: {
          source: "training",
          sensorSteps: 20,
          durationMs: 10_000,
        },
        route: [],
      }),
    ).toThrow("INVALID_STEP_SOURCE");
    expect(() =>
      verifyWalkSteps({
        mode: "training",
        startedAt: "2026-07-03T01:00:00.000Z",
        finishedAt: "2026-07-03T01:00:10.000Z",
        summary: {
          source: "motion",
          sensorSteps: 20,
          durationMs: 10_000,
        },
        route: [],
      }),
    ).toThrow("INVALID_STEP_SOURCE");
  });
});
