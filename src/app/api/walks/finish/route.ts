import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { finishWalk, type RoutePoint } from "../../../../domain/walk";
import { authenticatedUserId } from "../../../../server/session";
import { getGameRepository } from "../../../../server/storage";

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
      !Number.isFinite(point.latitude)
    ) {
      return null;
    }
    points.push({
      longitude: point.longitude,
      latitude: point.latitude,
      recordedAt: point.recordedAt,
    });
  }
  return points;
}

export async function POST(request: Request) {
  const repository = getGameRepository();
  const userId = await authenticatedUserId(repository, await cookies());
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const state = await repository.getState(userId);

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }
  if (
    !input ||
    typeof input !== "object" ||
    !("sessionId" in input) ||
    typeof input.sessionId !== "string" ||
    !("steps" in input) ||
    typeof input.steps !== "number" ||
    !("route" in input)
  ) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }
  const route = routePoints(input.route);
  const walk = state?.walks.find(({ id }) => id === input.sessionId);
  if (!walk || route === null) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const finishedAt = new Date().toISOString();
  try {
    const recap = finishWalk({
      session: {
        id: walk.id,
        mode: walk.mode,
        startedAt: walk.startedAt,
        canCreateRealCheckIn: walk.mode === "real",
      },
      steps: input.steps,
      finishedAt,
      route,
    });
    const result = await repository.applyAction(userId, {
      id: `finish:${walk.id}`,
      type: "FINISH_WALK",
      createdAt: finishedAt,
      payload: { walkId: walk.id, steps: input.steps },
    });
    return NextResponse.json({
      recap,
      memoryShards: result.state.wallet.memoryShards,
      earnedShards: Math.min(Math.floor(input.steps / 100), 80),
    });
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "WALK_FINISH_FAILED";
    return NextResponse.json({ error: code }, { status: 409 });
  }
}
