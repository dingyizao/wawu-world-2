import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { generateCreation } from "../../../server/creation-ai";
import { authenticatedUserId } from "../../../server/session";
import { getGameRepository } from "../../../server/storage";

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
  const prompt =
    input && typeof input === "object" && "prompt" in input &&
    typeof input.prompt === "string"
      ? input.prompt.trim()
      : "";
  if (!prompt || Array.from(prompt).length > 80) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const creation = await generateCreation(prompt);
  try {
    const id = randomUUID();
    const result = await repository.applyAction(userId, {
      id: `creation:${id}`,
      type: "COMPLETE_AGENT_ACTION",
      createdAt: new Date().toISOString(),
      payload: {
        actionType: "create",
        shardCost: 5,
        rewardItemId: creation.item.id,
      },
    });
    return NextResponse.json({
      ...creation,
      memoryShards: result.state.wallet.memoryShards,
    });
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "CREATION_FAILED";
    return NextResponse.json({ error: code }, { status: 409 });
  }
}
