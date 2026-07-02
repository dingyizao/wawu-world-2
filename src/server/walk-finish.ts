import type { RoutePoint } from "../domain/walk";
import type { StepSummary } from "../domain/types";

function routePoints(value: unknown): RoutePoint[] | null {
  if (!Array.isArray(value) || value.length > 200) {
    return null;
  }
  const points: RoutePoint[] = [];
  for (const point of value) {
    if (
      !point ||
      typeof point !== "object" ||
      !("longitude" in point) ||
      !("latitude" in point) ||
      !("recordedAt" in point) ||
      typeof point.longitude !== "number" ||
      typeof point.latitude !== "number" ||
      typeof point.recordedAt !== "string" ||
      !Number.isFinite(point.longitude) ||
      !Number.isFinite(point.latitude) ||
      !Number.isFinite(Date.parse(point.recordedAt)) ||
      ("accuracy" in point &&
        (typeof point.accuracy !== "number" ||
          !Number.isFinite(point.accuracy) ||
          point.accuracy < 0))
    ) {
      return null;
    }
    points.push({
      longitude: point.longitude,
      latitude: point.latitude,
      accuracy: "accuracy" in point ? point.accuracy : undefined,
      recordedAt: point.recordedAt,
    });
  }
  return points;
}

function stepSummary(value: unknown): StepSummary | null {
  if (
    !value ||
    typeof value !== "object" ||
    Object.keys(value).some(
      (key) =>
        key !== "source" && key !== "sensorSteps" && key !== "durationMs",
    ) ||
    !("source" in value) ||
    (value.source !== "motion" &&
      value.source !== "gps-estimate" &&
      value.source !== "training") ||
    !("sensorSteps" in value) ||
    typeof value.sensorSteps !== "number" ||
    !Number.isInteger(value.sensorSteps) ||
    value.sensorSteps < 0 ||
    !("durationMs" in value) ||
    typeof value.durationMs !== "number" ||
    !Number.isFinite(value.durationMs) ||
    value.durationMs < 0
  ) {
    return null;
  }
  return {
    source: value.source,
    sensorSteps: value.sensorSteps,
    durationMs: value.durationMs,
  };
}

export function parseWalkFinishInput(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Object.keys(value).some(
      (key) =>
        key !== "sessionId" && key !== "stepSummary" && key !== "route",
    ) ||
    !("sessionId" in value) ||
    typeof value.sessionId !== "string" ||
    value.sessionId.trim() === "" ||
    !("stepSummary" in value) ||
    !("route" in value)
  ) {
    return null;
  }
  const summary = stepSummary(value.stepSummary);
  const route = routePoints(value.route);
  return summary && route
    ? {
        sessionId: value.sessionId,
        stepSummary: summary,
        route,
      }
    : null;
}
