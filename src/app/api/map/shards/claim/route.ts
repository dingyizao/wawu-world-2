import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { authenticatedUserId } from "../../../../../server/session";
import { getGameRepository } from "../../../../../server/storage";

function parseInput(input: unknown) {
  if (
    !input ||
    typeof input !== "object" ||
    !("shardId" in input) ||
    typeof input.shardId !== "string" ||
    input.shardId.trim() === "" ||
    !("amount" in input) ||
    typeof input.amount !== "number" ||
    !Number.isInteger(input.amount) ||
    input.amount < 1 ||
    input.amount > 5
  ) {
    return null;
  }
  return {
    shardId: input.shardId.trim(),
    amount: input.amount,
  };
}

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
  const parsed = parseInput(input);
  if (!parsed) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  try {
    const result = await repository.applyAction(userId, {
      id: `map-shard:${parsed.shardId}`,
      type: "CLAIM_MAP_SHARD",
      createdAt: new Date().toISOString(),
      payload: parsed,
    });
    return NextResponse.json({
      claimed: true,
      deduped: result.deduped,
      memoryShards: result.state.wallet.memoryShards,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "CLAIM_MAP_SHARD_FAILED";
    return NextResponse.json({ error: code }, { status: 409 });
  }
}
