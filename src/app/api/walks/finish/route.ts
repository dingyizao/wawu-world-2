import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  finishWalk,
  verifyWalkSteps,
} from "../../../../domain/walk";
import { authenticatedUserId } from "../../../../server/session";
import { getGameRepository } from "../../../../server/storage";
import { parseWalkFinishInput } from "../../../../server/walk-finish";

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
  const parsed = parseWalkFinishInput(input);
  const walk = state?.walks.find(({ id }) => id === parsed?.sessionId);
  if (!parsed || !walk) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const finishedAt = new Date().toISOString();
  try {
    const verified = verifyWalkSteps({
      mode: walk.mode,
      startedAt: walk.startedAt,
      finishedAt,
      summary: parsed.stepSummary,
      route: parsed.route,
    });
    const recap = finishWalk({
      session: {
        id: walk.id,
        mode: walk.mode,
        startedAt: walk.startedAt,
        canCreateRealCheckIn: walk.mode === "real",
      },
      steps: verified.steps,
      finishedAt,
      route: parsed.route,
    });
    const result = await repository.applyAction(userId, {
      id: `finish:${walk.id}`,
      type: "FINISH_WALK",
      createdAt: finishedAt,
      payload: {
        walkId: walk.id,
        steps: verified.steps,
        stepSource: verified.source,
        distanceMeters: verified.distanceMeters,
      },
    });
    return NextResponse.json({
      recap: {
        ...recap,
        stepSource: verified.source,
        distanceMeters: verified.distanceMeters,
      },
      memoryShards: result.state.wallet.memoryShards,
      earnedShards: Math.min(Math.floor(verified.steps / 100), 80),
    });
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "WALK_FINISH_FAILED";
    return NextResponse.json({ error: code }, { status: 409 });
  }
}
