import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { CHENGDU_ANCHORS, checkInAnchor } from "../../../../domain/anchors";
import { itemDefinition } from "../../../../domain/inventory";
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
    !("anchorId" in input) ||
    typeof input.anchorId !== "string" ||
    !("walkId" in input) ||
    typeof input.walkId !== "string" ||
    !("mode" in input) ||
    (input.mode !== "real" && input.mode !== "training")
  ) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }
  const anchor = CHENGDU_ANCHORS.find(({ id }) => id === input.anchorId);
  if (!anchor) {
    return NextResponse.json({ error: "ANCHOR_NOT_FOUND" }, { status: 404 });
  }

  try {
    const checkIn = checkInAnchor({
      mode: input.mode,
      distance:
        "distance" in input && typeof input.distance === "number"
          ? input.distance
          : undefined,
    });
    const source = checkIn.training ? "training" : "checkin";
    const result = await repository.applyAction(userId, {
      id: `${source}:${anchor.id}:${input.walkId}`,
      type: "COMPLETE_AGENT_ACTION",
      createdAt: new Date().toISOString(),
      payload: {
        actionType: "explore",
        shardCost: 0,
        rewardItemId: anchor.rewardItemId,
      },
    });
    return NextResponse.json({
      checkIn,
      anchor,
      item: itemDefinition(anchor.rewardItemId),
      inventoryCount: result.state.inventory.length,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "CHECK_IN_FAILED";
    return NextResponse.json({ error: code }, { status: 409 });
  }
}
