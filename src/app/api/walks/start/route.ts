import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { startWalk } from "../../../../domain/walk";
import { authenticatedUserId } from "../../../../server/session";
import { getGameRepository } from "../../../../server/storage";

export async function POST(request: Request) {
  const repository = getGameRepository();
  const userId = await authenticatedUserId(repository, await cookies());
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }
  if (
    !input ||
    typeof input !== "object" ||
    !("mode" in input) ||
    (input.mode !== "real" && input.mode !== "training") ||
    !("locationConsent" in input) ||
    typeof input.locationConsent !== "boolean"
  ) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const now = new Date().toISOString();
  try {
    const session = startWalk({
      id: randomUUID(),
      mode: input.mode,
      locationConsent: input.locationConsent,
      startedAt: now,
    });
    await repository.applyAction(userId, {
      id: `start:${session.id}`,
      type: "START_WALK",
      createdAt: now,
      payload: { walkId: session.id, mode: session.mode },
    });
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "WALK_START_FAILED";
    return NextResponse.json({ error: code }, { status: 409 });
  }
}
